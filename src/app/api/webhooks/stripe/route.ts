import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import type { PlanType } from "@/lib/types/database";

function getPeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000).toISOString();
  }
  return null;
}

async function applySubscriptionUpdate(
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  subscription: Stripe.Subscription,
  userId: string
) {
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const periodEnd = getPeriodEnd(subscription);
  const isActive = subscription.status === "active" || subscription.status === "trialing";

  await svc.from("profiles").update({
    is_subscribed: isActive,
    subscription_status: subscription.status,
    subscription_price_id: priceId,
    subscription_current_period_end: periodEnd,
    plan: (isActive ? "plus" : "family") as PlanType,
  }).eq("id", userId);
}

async function resolveUserIdBySubscription(
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  subscriptionId: string
): Promise<string | null> {
  const { data } = await svc
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  return data?.id ?? null;
}

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
    console.error("[stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const svc = await createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.supabase_user_id
          ?? session.metadata?.supabase_user_id;

        if (!userId) {
          console.error("[stripe webhook] No supabase_user_id in metadata", session.id);
          break;
        }

        const customerId = typeof session.customer === "string"
          ? session.customer
          : (session.customer as Stripe.Customer | null)?.id;

        await svc.from("profiles").update({
          stripe_customer_id: customerId ?? undefined,
          stripe_subscription_id: subscriptionId,
        }).eq("id", userId);

        await applySubscriptionUpdate(svc, subscription, userId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id
          ?? await resolveUserIdBySubscription(svc, subscription.id);
        if (!userId) break;
        await applySubscriptionUpdate(svc, subscription, userId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id
          ?? await resolveUserIdBySubscription(svc, subscription.id);
        if (!userId) break;

        await svc.from("profiles").update({
          is_subscribed: false,
          subscription_status: "canceled",
          plan: "family" as PlanType,
        }).eq("id", userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.type === "subscription_details"
          ? (typeof invoice.parent.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : invoice.parent.subscription_details?.subscription?.id)
          : null;
        if (!subscriptionId) break;

        await svc.from("profiles").update({
          subscription_status: "past_due",
        }).eq("stripe_subscription_id", subscriptionId);
        break;
      }
    }
  } catch (err) {
    console.error("[stripe webhook] Error handling event:", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
