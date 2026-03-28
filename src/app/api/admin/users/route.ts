import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export type UserSubStatus = "active" | "trial_active" | "trial_expired" | "past_due" | "cancelled" | "free" | "none";

function resolveSubscriptionStatus(
  ownedHouseholds: Array<{ subscription_status: string; trial_ends_at: string | null }>,
  profileTrialEndsAt: string | null,
): { status: UserSubStatus; daysLeft: number | null } {
  const now = new Date();

  for (const h of ownedHouseholds) {
    if (h.subscription_status === "active") return { status: "active", daysLeft: null };
  }
  for (const h of ownedHouseholds) {
    if (h.subscription_status === "past_due") return { status: "past_due", daysLeft: null };
  }
  for (const h of ownedHouseholds) {
    if (h.subscription_status === "cancelled") return { status: "cancelled", daysLeft: null };
  }

  const trialDates: (string | null)[] = [
    ...ownedHouseholds.map((h) => h.trial_ends_at),
    profileTrialEndsAt,
  ];
  for (const t of trialDates) {
    if (!t) continue;
    const end = new Date(t);
    if (end > now) {
      const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
      return { status: "trial_active", daysLeft };
    }
  }
  if (trialDates.some(Boolean)) return { status: "trial_expired", daysLeft: null };
  if (ownedHouseholds.length === 0) return { status: "none", daysLeft: null };
  return { status: "free", daysLeft: null };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const subFilter = searchParams.get("subscription") ?? "";
  const perPage = 50;
  const hasFilter = !!subFilter;

  let query = svc
    .from("profiles")
    .select("id, full_name, email, account_type, created_at, trial_ends_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (!hasFilter) query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data: profiles, count: rawCount } = await query;
  if (!profiles) return NextResponse.json({ users: [], total: 0 });

  // Fetch auth data once for all users in this page
  const { data: authData } = await svc.auth.admin.listUsers({ perPage: 200 });
  const authMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null])
  );

  const withStats = await Promise.all(
    profiles.map(async (p) => {
      // Fix: use created_by, not household_members
      const { data: ownedHouseholds } = await svc
        .from("households")
        .select("id, subscription_status, trial_ends_at")
        .eq("created_by", p.id);

      const households = ownedHouseholds ?? [];
      const householdIds = households.map((h) => h.id as string);

      const resolved = resolveSubscriptionStatus(
        households,
        (p as { trial_ends_at?: string | null }).trial_ends_at ?? null,
      );

      let peopleCount = 0;
      if (householdIds.length > 0) {
        const { count } = await svc
          .from("people")
          .select("*", { count: "exact", head: true })
          .in("household_id", householdIds);
        peopleCount = count ?? 0;
      }

      const { count: aiCount } = await svc
        .from("api_usage_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id);

      const { data: lastAiRow } = await svc
        .from("api_usage_log")
        .select("created_at")
        .eq("user_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: docsScanned } = await svc
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("uploaded_by", p.id)
        .not("description", "is", null);

      return {
        ...p,
        household_count: householdIds.length,
        people_count: peopleCount,
        subscription_status: resolved.status,
        subscription_days_left: resolved.daysLeft,
        last_sign_in_at: authMap.get(p.id) ?? null,
        ai_count: aiCount ?? 0,
        docs_scanned: docsScanned ?? 0,
        last_ai_at: lastAiRow?.created_at ?? null,
      };
    })
  );

  if (hasFilter) {
    const filtered = withStats.filter((u) => {
      if (subFilter === "plus") return u.subscription_status === "active";
      if (subFilter === "trial") return u.subscription_status === "trial_active";
      if (subFilter === "trial_expired") return u.subscription_status === "trial_expired";
      if (subFilter === "free") return u.subscription_status === "free";
      if (subFilter === "cancelled") return u.subscription_status === "cancelled";
      if (subFilter === "none") return u.subscription_status === "none";
      return true;
    });
    const from = (page - 1) * perPage;
    return NextResponse.json({ users: filtered.slice(from, from + perPage), total: filtered.length });
  }

  return NextResponse.json({ users: withStats, total: rawCount ?? 0 });
}
