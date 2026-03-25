import type { AccountType, PlanType } from "@/lib/types/database";

interface ProfileForPermissions {
  account_type: AccountType;
  plan?: PlanType | null;
  trial_ends_at?: string | null;
  is_subscribed?: boolean;
}

interface HouseholdForPermissions {
  subscription_status: string;
  trial_ends_at?: string | null;
}

/**
 * Returns true if this care record has premium feature access.
 * Admins and testers always bypass the check.
 * Access is tied to the care record's subscription, not the individual user.
 */
export function hasCareRecordPremiumAccess(
  household: HouseholdForPermissions,
  profile: { account_type: AccountType }
): boolean {
  if (profile.account_type === "admin" || profile.account_type === "tester") {
    return true;
  }
  if (household.subscription_status === "active") {
    return true;
  }
  if (
    household.subscription_status === "trial" &&
    household.trial_ends_at &&
    new Date(household.trial_ends_at) > new Date()
  ) {
    return true;
  }
  return false;
}

/**
 * Returns true if the user's role allows them to upgrade the care record.
 * Only owners can manage billing.
 */
export function canUpgradeCareRecord(memberRole: string): boolean {
  return memberRole === "owner";
}

/**
 * Legacy profile-level check. Kept for backward compatibility during migration.
 * Prefer hasCareRecordPremiumAccess() for new code.
 */
export function hasPremiumAccess(profile: ProfileForPermissions): boolean {
  if (profile.account_type === "admin" || profile.account_type === "tester") {
    return true;
  }
  if (profile.plan === "family" || profile.plan === "custom" || profile.plan === "plus") {
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
