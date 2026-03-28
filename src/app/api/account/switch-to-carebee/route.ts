import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const svc = await createServiceClient();
  const { data: { user } } = await svc.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await svc
    .from("profiles")
    .select("user_type, plan, is_subscribed, trial_ends_at, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (profile.user_type !== "self_care") {
    return NextResponse.json({ error: "Account is already a carer account." }, { status: 400 });
  }

  // Keep the existing trial end date, or start a fresh 30-day trial if none
  const trialEndsAt = profile.trial_ends_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await svc.from("profiles").update({
    user_type: "carer",
    plan: "carebee_plus",
    trial_ends_at: trialEndsAt,
  }).eq("id", user.id);

  // Update owned household to carer trial status
  const { data: ownership } = await svc
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (ownership) {
    await svc.from("households").update({
      subscription_status: "trial",
      trial_ends_at: trialEndsAt,
    }).eq("id", ownership.household_id);
  }

  // If they have an active Stripe subscription, flag that they need to re-subscribe
  // on CareBee Plus (self-care plans are incompatible with carer plans)
  if (profile.is_subscribed && profile.stripe_subscription_id) {
    return NextResponse.json({ success: true, subscriptionTransferRequired: true });
  }

  return NextResponse.json({ success: true });
}
