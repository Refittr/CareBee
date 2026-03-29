import { createServiceClient } from "@/lib/supabase/server";

const PLAN_LIMITS: Record<string, number | null> = {
  free: 2,
  self_care_standard: 20,
  self_care_plus: null,   // unlimited
  carebee_plus: null,     // unlimited
  plus: null,             // legacy unlimited
  custom: null,           // legacy unlimited
};

/** Returns the monthly AI use limit for a plan, or null for unlimited. */
export function getAiLimit(plan: string | null | undefined): number | null | "check_household" {
  if (!plan) return "check_household"; // trial users have no plan set
  if (plan in PLAN_LIMITS) return PLAN_LIMITS[plan];
  return "check_household";
}

export interface AiUseResult {
  allowed: boolean;
  used: number;
  limit: number | null; // null = unlimited
}

/**
 * Checks whether the user is under their monthly AI usage limit,
 * increments the counter if allowed, and returns the result.
 *
 * Handles monthly reset automatically (resets after 30 days).
 * Admins and testers are always allowed and not counted.
 */
export async function checkAndIncrementAiUse(userId: string): Promise<AiUseResult> {
  const svc = await createServiceClient();

  const { data: profile } = await svc
    .from("profiles")
    .select("account_type, plan, ai_uses_count, ai_uses_reset_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return { allowed: false, used: 0, limit: 2 };

  // Admins and testers bypass all limits
  if (profile.account_type === "admin" || profile.account_type === "tester") {
    return { allowed: true, used: profile.ai_uses_count ?? 0, limit: null };
  }

  // Resolve the effective limit
  let limit: number | null;
  const rawLimit = getAiLimit(profile.plan);

  if (rawLimit === "check_household") {
    // User is likely on a trial — check their owned household
    const { data: membership } = await svc
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId)
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
      limit = 2; // no owned household → treat as free
    }
  } else {
    limit = rawLimit;
  }

  // Handle monthly reset
  let count = profile.ai_uses_count ?? 0;
  let needsReset = false;

  if (!profile.ai_uses_reset_at) {
    needsReset = true;
  } else {
    const daysSinceReset =
      (Date.now() - new Date(profile.ai_uses_reset_at).getTime()) / 86_400_000;
    if (daysSinceReset > 30) {
      count = 0;
      needsReset = true;
    }
  }

  // Check limit before incrementing
  if (limit !== null && count >= limit) {
    return { allowed: false, used: count, limit };
  }

  // Increment
  const newCount = count + 1;
  const updates: Record<string, unknown> = { ai_uses_count: newCount };
  if (needsReset) updates.ai_uses_reset_at = new Date().toISOString();

  await svc.from("profiles").update(updates).eq("id", userId);

  return { allowed: true, used: newCount, limit };
}
