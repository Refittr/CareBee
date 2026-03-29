import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAiLimit } from "@/lib/ai-usage";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("account_type, plan, ai_uses_count, ai_uses_reset_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (profile.account_type === "admin" || profile.account_type === "tester") {
    return NextResponse.json({ used: null, limit: null });
  }

  const rawLimit = getAiLimit(profile.plan);

  // For trial users we need to check household
  let limit: number | null;
  if (rawLimit === "check_household") {
    const { data: membership } = await svc
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (membership) {
      const { data: hh } = await svc
        .from("households")
        .select("subscription_status, trial_ends_at")
        .eq("id", membership.household_id)
        .maybeSingle();

      const activeTrial =
        hh?.subscription_status === "trial" &&
        hh.trial_ends_at &&
        new Date(hh.trial_ends_at) > new Date();
      const activeSubscription =
        hh?.subscription_status === "active" || hh?.subscription_status === "past_due";

      limit = activeTrial || activeSubscription ? null : 2;
    } else {
      limit = 2;
    }
  } else {
    limit = rawLimit;
  }

  // Apply monthly reset for display purposes
  let count = profile.ai_uses_count ?? 0;
  if (profile.ai_uses_reset_at) {
    const daysSinceReset =
      (Date.now() - new Date(profile.ai_uses_reset_at).getTime()) / 86_400_000;
    if (daysSinceReset > 30) count = 0;
  }

  return NextResponse.json({ used: count, limit });
}
