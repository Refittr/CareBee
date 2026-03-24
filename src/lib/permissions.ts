import type { AccountType, PlanType } from "@/lib/types/database";

interface ProfileForPermissions {
  account_type: AccountType;
  plan?: PlanType | null;
  trial_ends_at?: string | null;
  is_subscribed?: boolean;
}

/**
 * Returns true if the user should have access to AI / paid features.
 * Single source of truth for server-side feature gating.
 * When Stripe is added, update this function only.
 */
export function hasPremiumAccess(profile: ProfileForPermissions): boolean {
  if (profile.account_type === "admin" || profile.account_type === "tester") {
    return true;
  }

  if (profile.plan === "family" || profile.plan === "custom") {
    return true;
  }

  if (profile.is_subscribed) {
    return true;
  }

  if (profile.trial_ends_at) {
    return new Date(profile.trial_ends_at) > new Date();
  }

  return false;
}

export function isAdmin(profile: { account_type: AccountType }): boolean {
  return profile.account_type === "admin";
}

export function isTester(profile: { account_type: AccountType }): boolean {
  return profile.account_type === "tester";
}
