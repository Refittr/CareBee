import type { AccountType, UserType, PlanType } from "@/lib/types/database";

export interface PlanCapabilities {
  maxPeople: number | null; // null = unlimited
  canInviteMembers: boolean;
  unlimitedAI: boolean;
  hasFullAccess: boolean;
}

interface ProfileForCapabilities {
  account_type: AccountType;
  user_type: UserType | null;
  plan: PlanType | null;
  is_subscribed: boolean;
  trial_ends_at: string | null;
}

interface HouseholdForCapabilities {
  subscription_status: string;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
}

function trialActive(trial_ends_at: string | null): boolean {
  if (!trial_ends_at) return false;
  return new Date(trial_ends_at) > new Date();
}

export function getCapabilities(
  profile: ProfileForCapabilities,
  household?: HouseholdForCapabilities | null,
): PlanCapabilities {
  if (profile.account_type === "admin" || profile.account_type === "tester") {
    return { maxPeople: null, canInviteMembers: true, unlimitedAI: true, hasFullAccess: true };
  }

  const profileTrial = trialActive(profile.trial_ends_at);

  if (profile.user_type === "self_care") {
    const isPaid = profile.is_subscribed;
    const isOnPaidPlan = profile.plan === "self_care_standard" || profile.plan === "self_care_plus";
    const hasFullAccess = isPaid || isOnPaidPlan || profileTrial;
    const unlimitedAI = profile.plan === "self_care_plus" || profileTrial;
    return { maxPeople: 1, canInviteMembers: false, unlimitedAI, hasFullAccess };
  }

  // Carer: household subscription is the source of truth
  let householdAccess = false;
  if (household) {
    const s = household.subscription_status;
    if (s === "active" || s === "past_due") {
      householdAccess = true;
    } else if (s === "cancelled" && household.subscription_ends_at) {
      householdAccess = new Date(household.subscription_ends_at) > new Date();
    } else if (s === "trial" && household.trial_ends_at) {
      householdAccess = new Date(household.trial_ends_at) > new Date();
    }
  }

  const hasFullAccess = householdAccess || profile.is_subscribed || profileTrial;

  return {
    maxPeople: hasFullAccess ? null : 1,
    canInviteMembers: hasFullAccess,
    unlimitedAI: hasFullAccess,
    hasFullAccess,
  };
}

export function isSelfCare(user_type: UserType | null): boolean {
  return user_type === "self_care";
}
