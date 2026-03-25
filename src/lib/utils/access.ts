"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasCareRecordPremiumAccess } from "@/lib/permissions";

/**
 * Returns true if the current care record has premium feature access.
 * Checks household subscription status; admins/testers bypass.
 */
export function useAIAccess(householdId: string): { hasAccess: boolean | null } {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!householdId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setHasAccess(false); return; }
      Promise.all([
        supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle(),
        supabase.from("households").select("subscription_status, trial_ends_at").eq("id", householdId).maybeSingle(),
      ]).then(([{ data: profile }, { data: household }]) => {
        setHasAccess(
          profile && household ? hasCareRecordPremiumAccess(household, profile) : false
        );
      });
    });
  }, [householdId]);

  return { hasAccess };
}
