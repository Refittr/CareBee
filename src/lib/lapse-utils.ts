import { createServiceClient } from "@/lib/supabase/server";

/**
 * Called when a user's plan reverts to free (trial expiry or subscription cancelled).
 * Sets plan_lapsed_at and resets the email step counter.
 * Also sets plan = 'free' and is_subscribed = false on the profile.
 */
export async function applyPlanLapse(userId: string): Promise<void> {
  const svc = await createServiceClient();

  await svc.from("profiles").update({
    plan: "free",
    is_subscribed: false,
    plan_lapsed_at: new Date().toISOString(),
    lapse_email_step: 0,
  }).eq("id", userId);
}

/**
 * Locks all secondary households (all except the earliest-created owned household).
 * Called on day 7 of the grace period.
 */
export async function applyHouseholdLocks(userId: string): Promise<void> {
  const svc = await createServiceClient();

  const { data: memberships } = await svc
    .from("household_members")
    .select("household_id, households(id, created_at)")
    .eq("user_id", userId)
    .eq("role", "owner");

  if (!memberships || memberships.length <= 1) return;

  // Sort by household.created_at ASC — the first is the primary (never locked)
  const sorted = [...memberships].sort((a, b) => {
    const aDate = (a.households as { created_at: string } | null)?.created_at ?? "";
    const bDate = (b.households as { created_at: string } | null)?.created_at ?? "";
    return aDate < bDate ? -1 : 1;
  });

  const toLock = sorted.slice(1).map((m) => m.household_id as string);
  if (!toLock.length) return;

  await svc.from("households").update({
    is_locked: true,
    locked_at: new Date().toISOString(),
  }).in("id", toLock);
}

/**
 * Called when a user successfully subscribes or resubscribes.
 * Clears lapse state and unlocks all their owned households.
 */
export async function clearPlanLapse(userId: string): Promise<void> {
  const svc = await createServiceClient();

  await svc.from("profiles").update({
    plan_lapsed_at: null,
    lapse_email_step: 0,
  }).eq("id", userId);

  const { data: memberships } = await svc
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .eq("role", "owner");

  if (!memberships?.length) return;

  const ids = memberships.map((m) => m.household_id as string);
  await svc.from("households").update({
    is_locked: false,
    locked_at: null,
  }).in("id", ids);
}
