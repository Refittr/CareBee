import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export type UserSubStatus = "active" | "trial_active" | "trial_expired" | "past_due" | "cancelled" | "free" | "none";

function resolveSubscriptionStatus(
  ownedHouseholds: Array<{ subscription_status: string; trial_ends_at: string | null }>
): { status: UserSubStatus; daysLeft: number | null } {
  if (ownedHouseholds.length === 0) return { status: "none", daysLeft: null };
  const now = new Date();

  for (const h of ownedHouseholds) {
    if (h.subscription_status === "active") return { status: "active", daysLeft: null };
  }
  for (const h of ownedHouseholds) {
    if (h.subscription_status === "past_due") return { status: "past_due", daysLeft: null };
  }
  for (const h of ownedHouseholds) {
    if (h.subscription_status === "trial" && h.trial_ends_at && new Date(h.trial_ends_at) > now) {
      const daysLeft = Math.max(0, Math.ceil((new Date(h.trial_ends_at).getTime() - now.getTime()) / 86400000));
      return { status: "trial_active", daysLeft };
    }
  }
  for (const h of ownedHouseholds) {
    if (h.subscription_status === "trial") return { status: "trial_expired", daysLeft: null };
  }
  for (const h of ownedHouseholds) {
    if (h.subscription_status === "cancelled") return { status: "cancelled", daysLeft: null };
  }
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
    .select("id, full_name, email, account_type, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (!hasFilter) query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data: profiles, count: rawCount } = await query;
  if (!profiles) return NextResponse.json({ users: [], total: 0 });

  const withStats = await Promise.all(
    profiles.map(async (p) => {
      const { data: ownedMemberships } = await svc
        .from("household_members")
        .select("household_id")
        .eq("user_id", p.id)
        .eq("role", "owner");

      let subStatus: UserSubStatus = "none";
      let subDaysLeft: number | null = null;

      if (ownedMemberships && ownedMemberships.length > 0) {
        const householdIds = ownedMemberships.map((m) => m.household_id as string);
        const { data: ownedHouseholds } = await svc
          .from("households")
          .select("subscription_status, trial_ends_at")
          .in("id", householdIds);
        const resolved = resolveSubscriptionStatus(ownedHouseholds ?? []);
        subStatus = resolved.status;
        subDaysLeft = resolved.daysLeft;
      }

      const { count: householdCount } = await svc
        .from("household_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id);

      return {
        ...p,
        household_count: householdCount ?? 0,
        people_count: 0,
        subscription_status: subStatus,
        subscription_days_left: subDaysLeft,
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
