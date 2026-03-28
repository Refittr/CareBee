import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import {
  getValidPriceIds,
  priceIdToPlan,
  isAnnualPriceId,
  planAndBillingToPriceId,
} from "@/lib/stripe-config";
import type { PlanType, UserType } from "@/lib/types/database";

const PLAN_ORDER: Record<string, number> = {
  free:               0,
  self_care_standard: 1,
  self_care_plus:     2,
  carebee_plus:       3,
  plus:               3, // legacy
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { targetPlan } = body as { targetPlan?: PlanType };
  if (!targetPlan) {
    return NextResponse.json({ error: "Missing targetPlan" }, { status: 400 });
  }

  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("stripe_subscription_id, user_type, plan")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
  }

  // Validate the target plan is allowed for this user's user_type
  const userType = (profile.user_type as UserType | null) ?? null;
  const validPriceIds = getValidPriceIds(userType);

  // Retrieve the current subscription to determine billing period
  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const currentItem = subscription.items.data[0];
  if (!currentItem) {
    return NextResponse.json({ error: "Could not retrieve subscription details." }, { status: 400 });
  }

  const currentPriceId = currentItem.price.id;
  const annual = isAnnualPriceId(currentPriceId);
  const newPriceId = planAndBillingToPriceId(targetPlan, annual);

  if (!newPriceId || !validPriceIds.includes(newPriceId)) {
    return NextResponse.json({ error: "Invalid plan for your account type." }, { status: 400 });
  }

  const currentPlan = priceIdToPlan(currentPriceId);
  const isUpgrade = (PLAN_ORDER[targetPlan] ?? 0) > (PLAN_ORDER[currentPlan] ?? 0);

  // Update the Stripe subscription
  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    items: [{ id: currentItem.id, price: newPriceId }],
    proration_behavior: isUpgrade ? "always_invoice" : "none",
  });

  // For upgrades: update profile plan immediately (webhook will also fire)
  if (isUpgrade) {
    await svc.from("profiles").update({
      plan: targetPlan,
      subscription_price_id: newPriceId,
    }).eq("id", user.id);
  }

  return NextResponse.json({ success: true, plan: targetPlan, isUpgrade });
}
