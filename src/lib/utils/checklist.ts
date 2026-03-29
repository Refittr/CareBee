import { createClient } from "@/lib/supabase/client";

/**
 * Mark an onboarding step as complete for the current user.
 * Silently skips if not authenticated, step doesn't exist, or already complete.
 * Fire-and-forget safe.
 */
export async function markChecklistStep(stepKey: string): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("onboarding_checklist")
      .update({ completed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("step_key", stepKey)
      .is("completed_at", null);
  } catch {
    // Non-critical — swallow all errors
  }
}

/**
 * On first checklist load, check whether any steps are already satisfied by
 * existing data. Two-step: seed any missing rows first, then do targeted
 * UPDATE for steps whose data is already present. Works for accounts that
 * pre-date the checklist as well as normal new users.
 * Returns after writing so the caller can trigger a UI reload.
 */
export async function backfillExistingSteps(
  userType: "self_care" | "carer",
  householdId: string,
  personId: string,
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const allSteps = userType === "self_care"
      ? ["add_profile", "add_first_condition_or_med", "scan_first_document"]
      : ["add_person", "add_first_condition_or_med", "scan_first_document", "invite_family"];

    // Step 1: Ensure every step row exists (ignoreDuplicates = never overwrite existing data)
    await supabase
      .from("onboarding_checklist")
      .upsert(
        allSteps.map((step_key) => ({ user_id: user.id, step_key, completed_at: null })),
        { onConflict: "user_id,step_key", ignoreDuplicates: true },
      );

    // Step 2: Fetch current state and find incomplete steps to check
    const { data: existing } = await supabase
      .from("onboarding_checklist")
      .select("step_key, completed_at")
      .eq("user_id", user.id);

    const toCheck = allSteps.filter(
      (s) => !existing?.find((r) => r.step_key === s)?.completed_at,
    );
    if (toCheck.length === 0) return;

    // Step 3: Run data existence checks in parallel
    const completedByData = new Set<string>();

    await Promise.all([
      ...(toCheck.includes("add_profile") && personId ? [
        supabase.from("people")
          .select("id", { count: "exact", head: true })
          .eq("id", personId)
          .then(({ count }) => { if ((count ?? 0) > 0) completedByData.add("add_profile"); }),
      ] : []),

      ...(toCheck.includes("add_person") ? [
        supabase.from("people")
          .select("id", { count: "exact", head: true })
          .eq("household_id", householdId)
          .then(({ count }) => { if ((count ?? 0) > 0) completedByData.add("add_person"); }),
      ] : []),

      ...(toCheck.includes("add_first_condition_or_med") && personId ? [
        Promise.all([
          supabase.from("conditions").select("id", { count: "exact", head: true }).eq("person_id", personId),
          supabase.from("medications").select("id", { count: "exact", head: true }).eq("person_id", personId),
        ]).then(([cond, med]) => {
          if ((cond.count ?? 0) > 0 || (med.count ?? 0) > 0) completedByData.add("add_first_condition_or_med");
        }),
      ] : []),

      ...(toCheck.includes("scan_first_document") && personId ? [
        supabase.from("documents")
          .select("id", { count: "exact", head: true })
          .eq("person_id", personId)
          .then(({ count }) => { if ((count ?? 0) > 0) completedByData.add("scan_first_document"); }),
      ] : []),

      ...(toCheck.includes("invite_family") ? [
        supabase.from("invitations")
          .select("id", { count: "exact", head: true })
          .eq("household_id", householdId)
          .then(({ count }) => { if ((count ?? 0) > 0) completedByData.add("invite_family"); }),
      ] : []),

    ]);

    if (completedByData.size === 0) return;

    // Step 4: Targeted UPDATE for each step that data shows is done
    const now = new Date().toISOString();
    await Promise.all(
      Array.from(completedByData).map((step_key) =>
        supabase
          .from("onboarding_checklist")
          .update({ completed_at: now })
          .eq("user_id", user.id)
          .eq("step_key", step_key)
          .is("completed_at", null),
      ),
    );
  } catch (e) {
    console.error("[checklist] backfill error:", e);
  }
}

/**
 * Seed the onboarding checklist rows for a new user.
 * Called once during onboarding after user_type is determined.
 * Uses upsert with ignoreDuplicates so it is safe to call more than once.
 */
export async function seedChecklist(
  userId: string,
  userType: "self_care" | "carer",
): Promise<void> {
  try {
    const supabase = createClient();

    const steps =
      userType === "self_care"
        ? ["add_profile", "add_first_condition_or_med", "scan_first_document"]
        : ["add_person", "add_first_condition_or_med", "scan_first_document", "invite_family"];

    const rows = steps.map((step_key) => ({ user_id: userId, step_key, completed_at: null }));

    await supabase
      .from("onboarding_checklist")
      .upsert(rows, { onConflict: "user_id,step_key", ignoreDuplicates: true });
  } catch {
    // Non-critical
  }
}
