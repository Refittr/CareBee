"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasCareRecordPremiumAccess } from "@/lib/permissions";

const FREE_AI_LIMIT = 2;

/**
 * Returns true if the current care record has premium feature access,
 * OR if the user is on the free plan but still has remaining monthly AI credits.
 * Admins/testers always bypass.
 */
export function useAIAccess(householdId: string): { hasAccess: boolean | null } {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!householdId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setHasAccess(false); return; }
      Promise.all([
        supabase.from("profiles").select("account_type, plan, ai_uses_count, ai_uses_reset_at").eq("id", user.id).maybeSingle(),
        supabase.from("households").select("subscription_status, trial_ends_at").eq("id", householdId).maybeSingle(),
      ]).then(([{ data: profile }, { data: household }]) => {
        if (!profile || !household) { setHasAccess(false); return; }

        // Admins/testers always have access
        if (profile.account_type === "admin" || profile.account_type === "tester") {
          setHasAccess(true); return;
        }

        // Premium/trial subscription — use standard check
        if (hasCareRecordPremiumAccess(household, profile)) {
          setHasAccess(true); return;
        }

        // Free plan: allow if monthly credit not yet exhausted
        if (profile.plan === "free") {
          let count = (profile.ai_uses_count as number | null) ?? 0;
          const resetAt = profile.ai_uses_reset_at as string | null;
          if (resetAt) {
            const daysSince = (Date.now() - new Date(resetAt).getTime()) / 86_400_000;
            if (daysSince > 30) count = 0;
          }
          setHasAccess(count < FREE_AI_LIMIT); return;
        }

        setHasAccess(false);
      });
    });
  }, [householdId]);

  return { hasAccess };
}
