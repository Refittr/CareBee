"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AccountType, PlanType } from "@/lib/types/database";

interface ProfileForAIAccess {
  account_type: AccountType;
  plan: PlanType;
  trial_ends_at?: string | null;
}

/**
 * Returns true if the user should have access to AI features.
 * Single source of truth for AI feature gating.
 */
export function hasAIAccess(profile: ProfileForAIAccess): boolean {
  if (profile.account_type === "admin" || profile.account_type === "tester") {
    return true;
  }
  if (profile.plan === "family" || profile.plan === "custom") {
    return true;
  }
  if (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
    return true;
  }
  return false;
}

/**
 * React hook that loads the current user's profile and returns
 * whether they have access to AI features. Returns null while loading.
 */
export function useAIAccess(): { hasAccess: boolean | null } {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setHasAccess(false); return; }
      supabase
        .from("profiles")
        .select("account_type, plan, trial_ends_at")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setHasAccess(data ? hasAIAccess(data as ProfileForAIAccess) : false);
        });
    });
  }, []);

  return { hasAccess };
}
