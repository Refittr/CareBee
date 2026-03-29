import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { priceIdToPlan } from "@/lib/stripe-config";
import { applyPlanLapse, clearPlanLapse } from "@/lib/lapse-utils";
import type Stripe from "stripe";
import type { PlanType } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIso(unixTs: number | null | undefined): string | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000).toISOString();
}

function log(event: string, subId: string | null, householdId: string | null, action: string) {
  console.log(`[Stripe Webhook] ${event} | Sub: ${subId ?? "-"} | Household: ${householdId ?? "-"} | ${action}`);
}

async function findHouseholdBySubId(
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  subscriptionId: string
): Promise<string | null> {
  const { data } = await svc
    .from("households")
    .select("id")
    .eq("subscription_id", subscriptionId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Derive the status to store on the household from a Stripe subscription. */
function resolveHouseholdStatus(subscription: Stripe.Subscription): string {
  if (subscription.cancel_at_period_end) return "cancelled";
  switch (subscription.status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "free";
  }
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const svc = await createServiceClient();

  try {
    switch (event.type) {

      // -----------------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const userId = subscription.metadata?.supabase_user_id ?? session.metadata?.supabase_user_id;
        const householdId = subscription.metadata?.household_id ?? session.metadata?.household_id;

        if (!userId) {
          console.error("[Stripe Webhook] checkout.session.completed: no supabase_user_id in metadata", session.id);
          break;
        }

        const customerId = typeof session.customer === "string"
          ? session.customer
          : (session.customer as Stripe.Customer | null)?.id ?? null;

        const priceId = subscription.items.data[0]?.price.id ?? null;
        const plan = priceIdToPlan(priceId) as PlanType;

        // Store Stripe IDs on profile
        await svc.from("profiles").update({
          stripe_customer_id: customerId ?? undefined,
          stripe_subscription_id: subscriptionId,
          is_subscribed: true,
          subscription_status: subscription.status,
          subscription_price_id: priceId,
          subscription_current_period_end: toIso(subscription.items.data[0]?.current_period_end),
          plan,
        }).eq("id", userId);

        // Clear any lapse state and unlock households
        await clearPlanLapse(userId);

        // Update the specific household
        if (householdId) {
          await svc.from("households").update({
            subscription_status: "active",
            subscription_id: subscriptionId,
            subscription_started_at: toIso(subscription.start_date),
            subscription_ends_at: toIso(subscription.items.data[0]?.current_period_end),
          }).eq("id", householdId);
          log("checkout.session.completed", subscriptionId, householdId, "Set status to active");
        } else {
          // Fallback: update all owned households if no household_id in metadata
          const { data: owned } = await svc
            .from("household_members")
            .select("household_id")
            .eq("user_id", userId)
            .eq("role", "owner");
          if (owned && owned.length > 0) {
            const ids = owned.map((m) => m.household_id as string);
            await svc.from("households").update({
              subscription_status: "active",
              subscription_id: subscriptionId,
              subscription_started_at: toIso(subscription.start_date),
              subscription_ends_at: toIso(subscription.items.data[0]?.current_period_end),
            }).in("id", ids);
            log("checkout.session.completed", subscriptionId, ids.join(","), "Set status to active (fallback: all owned)");
          }
        }
        break;
      }

      // -----------------------------------------------------------------------
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const householdId = await findHouseholdBySubId(svc, subscription.id)
          ?? (await (async () => {
            const userId = subscription.metadata?.supabase_user_id;
            if (!userId) return null;
            const { data } = await svc.from("household_members").select("household_id").eq("user_id", userId).eq("role", "owner").maybeSingle();
            return data?.household_id ?? null;
          })());

        const householdStatus = resolveHouseholdStatus(subscription);
        const periodEnd = toIso(subscription.items.data[0]?.current_period_end);
        const cancelAt = toIso(subscription.cancel_at ?? undefined);

        const action = subscription.cancel_at_period_end
          ? `Set status to cancelled (ends ${cancelAt})`
          : `Set status to ${householdStatus}`;

        log("customer.subscription.updated", subscription.id, householdId, action);

        const updatePayload: Record<string, unknown> = {
          subscription_status: householdStatus,
          subscription_ends_at: subscription.cancel_at_period_end ? cancelAt : periodEnd,
        };

        if (householdId) {
          await svc.from("households").update(updatePayload).eq("id", householdId);
        }

        // Keep profile in sync
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          const priceId = subscription.items.data[0]?.price.id ?? null;
          const plan = priceIdToPlan(priceId) as PlanType;
          await svc.from("profiles").update({
            is_subscribed: isActive && !subscription.cancel_at_period_end,
            subscription_status: subscription.status,
            subscription_price_id: priceId,
            subscription_current_period_end: periodEnd,
            plan: isActive ? plan : "free" as PlanType,
          }).eq("id", userId);
        }
        break;
      }

      // -----------------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const householdId = await findHouseholdBySubId(svc, subscription.id);

        log("customer.subscription.deleted", subscription.id, householdId, "Set status to free");

        if (householdId) {
          await svc.from("households").update({
            subscription_status: "free",
            subscription_ends_at: new Date().toISOString(),
            // Keep subscription_id and subscription_started_at for records
          }).eq("id", householdId);
        }

        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          await svc.from("profiles").update({
            is_subscribed: false,
            subscription_status: "canceled",
          }).eq("id", userId);
          // Start the 7-day grace period — sets plan='free', plan_lapsed_at, lapse_email_step=0
          await applyPlanLapse(userId);
        }
        break;
      }

      // -----------------------------------------------------------------------
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.type === "subscription_details"
          ? (typeof invoice.parent.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : (invoice.parent.subscription_details?.subscription as Stripe.Subscription | null)?.id ?? null)
          : null;
        if (!subscriptionId) break;

        const householdId = await findHouseholdBySubId(svc, subscriptionId);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = toIso(subscription.items.data[0]?.current_period_end);
        const priceId = subscription.items.data[0]?.price.id ?? null;
        const plan = priceIdToPlan(priceId) as PlanType;

        log("invoice.payment_succeeded", subscriptionId, householdId, `Set status to active, ends ${periodEnd}`);

        if (householdId) {
          await svc.from("households").update({
            subscription_status: "active",
            subscription_ends_at: periodEnd,
          }).eq("id", householdId);
        }

        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          await svc.from("profiles").update({
            is_subscribed: true,
            subscription_status: "active",
            subscription_price_id: priceId,
            subscription_current_period_end: periodEnd,
            plan,
          }).eq("id", userId);
          // Clear any lapse state and unlock households
          await clearPlanLapse(userId);
        }
        break;
      }

      // -----------------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.type === "subscription_details"
          ? (typeof invoice.parent.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : (invoice.parent.subscription_details?.subscription as Stripe.Subscription | null)?.id ?? null)
          : null;
        if (!subscriptionId) break;

        const householdId = await findHouseholdBySubId(svc, subscriptionId);
        log("invoice.payment_failed", subscriptionId, householdId, "Set status to past_due");

        if (householdId) {
          await svc.from("households").update({ subscription_status: "past_due" }).eq("id", householdId);
        }

        // Also update profile for billing UI
        await svc.from("profiles").update({ subscription_status: "past_due" }).eq("stripe_subscription_id", subscriptionId);
        break;
      }

    }
  } catch (err) {
    console.error("[Stripe Webhook] Error handling event:", event.type, err);
    // Return 200 so Stripe does not keep retrying for bugs on our side
    return NextResponse.json({ received: true, error: "Handler error" });
  }

  return NextResponse.json({ received: true });
}
