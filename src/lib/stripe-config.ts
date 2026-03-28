import type { PlanType, UserType } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Early-adopter intro price cutoff for CareBee Plus
// ---------------------------------------------------------------------------
export const CAREBEE_PLUS_INTRO_CUTOFF = new Date("2026-07-01T00:00:00.000Z");

export function isCareBeeIntroActive(): boolean {
  return new Date() < CAREBEE_PLUS_INTRO_CUTOFF;
}

// ---------------------------------------------------------------------------
// Price IDs, loaded from environment variables.
// NEXT_PUBLIC_ prefix makes them available in client components as well as
// server routes and webhook handlers.
// ---------------------------------------------------------------------------
export const PRICE_IDS = {
  self_care_standard: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_SC_STD_MONTHLY  ?? "",
    annual:  process.env.NEXT_PUBLIC_STRIPE_SC_STD_ANNUAL   ?? "",
  },
  self_care_plus: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_SC_PLUS_MONTHLY ?? "",
    annual:  process.env.NEXT_PUBLIC_STRIPE_SC_PLUS_ANNUAL  ?? "",
  },
  carebee_plus_intro: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_CB_INTRO_MONTHLY ?? "",
    annual:  process.env.NEXT_PUBLIC_STRIPE_CB_INTRO_ANNUAL  ?? "",
  },
  carebee_plus_standard: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_CB_PLUS_MONTHLY ?? "",
    annual:  process.env.NEXT_PUBLIC_STRIPE_CB_PLUS_ANNUAL  ?? "",
  },
} as const;

// ---------------------------------------------------------------------------
// Tier info used by pricing and upgrade UI
// ---------------------------------------------------------------------------
export interface TierInfo {
  plan: PlanType;
  name: string;
  monthlyAmount: number;
  annualAmount: number;
  monthlyPriceId: string;
  annualPriceId: string;
  features: string[];
  recommended?: boolean;
}

export function getAvailableTiers(userType: UserType | null): TierInfo[] {
  if (userType === "self_care") {
    return [
      {
        plan: "self_care_standard",
        name: "Self-Care Standard",
        monthlyAmount: 2.99,
        annualAmount: 29.99,
        monthlyPriceId: PRICE_IDS.self_care_standard.monthly,
        annualPriceId:  PRICE_IDS.self_care_standard.annual,
        features: [
          "20 AI uses per month",
          "Health insights and NICE guideline checks",
          "Document scanning and data extraction",
          "Drug interaction detection",
          "Benefits and entitlements eligibility check",
          "NHS letter management",
        ],
      },
      {
        plan: "self_care_plus",
        name: "Self-Care Plus",
        monthlyAmount: 4.99,
        annualAmount: 49.99,
        monthlyPriceId: PRICE_IDS.self_care_plus.monthly,
        annualPriceId:  PRICE_IDS.self_care_plus.annual,
        recommended: true,
        features: [
          "Unlimited AI uses",
          "Health insights and NICE guideline checks",
          "Document scanning and data extraction",
          "Drug interaction detection",
          "Benefits and entitlements eligibility check",
          "NHS letter management",
          "Appointment prep briefs and post-visit summaries",
        ],
      },
    ];
  }

  // Carer (or null - default to carer experience)
  const intro = isCareBeeIntroActive();
  return [
    {
      plan: "carebee_plus",
      name: "CareBee Plus",
      monthlyAmount: intro ? 4.99 : 7.99,
      annualAmount:  intro ? 44.99 : 79.99,
      monthlyPriceId: intro
        ? PRICE_IDS.carebee_plus_intro.monthly
        : PRICE_IDS.carebee_plus_standard.monthly,
      annualPriceId: intro
        ? PRICE_IDS.carebee_plus_intro.annual
        : PRICE_IDS.carebee_plus_standard.annual,
      recommended: true,
      features: [
        "Unlimited AI uses",
        "Multiple people in one care record",
        "Care circle: invite family members and carers",
        "Health insights and NICE guideline checks",
        "Document scanning and data extraction",
        "Drug interaction detection",
        "Appointment prep briefs and post-visit summaries",
        "Weekly digest emails",
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Price ID -> plan name (safe: skips empty/unset IDs)
// ---------------------------------------------------------------------------
export function priceIdToPlan(priceId: string | null | undefined): PlanType {
  if (!priceId) return "carebee_plus";
  const entries: [string, PlanType][] = [
    [PRICE_IDS.self_care_standard.monthly,    "self_care_standard"],
    [PRICE_IDS.self_care_standard.annual,     "self_care_standard"],
    [PRICE_IDS.self_care_plus.monthly,        "self_care_plus"],
    [PRICE_IDS.self_care_plus.annual,         "self_care_plus"],
    [PRICE_IDS.carebee_plus_intro.monthly,    "carebee_plus"],
    [PRICE_IDS.carebee_plus_intro.annual,     "carebee_plus"],
    [PRICE_IDS.carebee_plus_standard.monthly, "carebee_plus"],
    [PRICE_IDS.carebee_plus_standard.annual,  "carebee_plus"],
    // Legacy prices kept for existing subscribers
    [process.env.STRIPE_MONTHLY_PRICE_ID ?? "", "carebee_plus"],
    [process.env.STRIPE_ANNUAL_PRICE_ID  ?? "", "carebee_plus"],
  ];
  for (const [id, plan] of entries) {
    if (id && id === priceId) return plan;
  }
  return "carebee_plus";
}

// ---------------------------------------------------------------------------
// Returns all valid price IDs for a given user_type (used in checkout validation)
// ---------------------------------------------------------------------------
export function getValidPriceIds(userType: UserType | null): string[] {
  if (userType === "self_care") {
    return [
      PRICE_IDS.self_care_standard.monthly,
      PRICE_IDS.self_care_standard.annual,
      PRICE_IDS.self_care_plus.monthly,
      PRICE_IDS.self_care_plus.annual,
    ].filter(Boolean);
  }
  // Carer: all CareBee Plus variants plus legacy prices
  return [
    PRICE_IDS.carebee_plus_intro.monthly,
    PRICE_IDS.carebee_plus_intro.annual,
    PRICE_IDS.carebee_plus_standard.monthly,
    PRICE_IDS.carebee_plus_standard.annual,
    process.env.STRIPE_MONTHLY_PRICE_ID ?? "",
    process.env.STRIPE_ANNUAL_PRICE_ID  ?? "",
  ].filter(Boolean);
}

// ---------------------------------------------------------------------------
// Determine if a price ID is an annual price
// ---------------------------------------------------------------------------
export function isAnnualPriceId(priceId: string): boolean {
  const annualIds = [
    PRICE_IDS.self_care_standard.annual,
    PRICE_IDS.self_care_plus.annual,
    PRICE_IDS.carebee_plus_intro.annual,
    PRICE_IDS.carebee_plus_standard.annual,
    process.env.STRIPE_ANNUAL_PRICE_ID ?? "",
  ].filter(Boolean);
  return annualIds.includes(priceId);
}

// ---------------------------------------------------------------------------
// Given a plan + billing period, return the correct price ID
// ---------------------------------------------------------------------------
export function planAndBillingToPriceId(plan: PlanType, isAnnual: boolean): string {
  const intro = isCareBeeIntroActive();
  switch (plan) {
    case "self_care_standard":
      return isAnnual ? PRICE_IDS.self_care_standard.annual : PRICE_IDS.self_care_standard.monthly;
    case "self_care_plus":
      return isAnnual ? PRICE_IDS.self_care_plus.annual : PRICE_IDS.self_care_plus.monthly;
    case "carebee_plus":
      if (intro) return isAnnual ? PRICE_IDS.carebee_plus_intro.annual : PRICE_IDS.carebee_plus_intro.monthly;
      return isAnnual ? PRICE_IDS.carebee_plus_standard.annual : PRICE_IDS.carebee_plus_standard.monthly;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Friendly display names for plan values stored in the database
// ---------------------------------------------------------------------------
export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free:               "Free",
  self_care_standard: "Self-Care Standard",
  self_care_plus:     "Self-Care Plus",
  carebee_plus:       "CareBee Plus",
  plus:               "CareBee Plus",  // legacy
  family:             "Free",           // legacy
  custom:             "Custom",
};

export function getPlanDisplayName(plan: string | null | undefined): string {
  if (!plan) return "Free";
  return PLAN_DISPLAY_NAMES[plan] ?? plan;
}
