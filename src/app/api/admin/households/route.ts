import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const sort = searchParams.get("sort") ?? "newest";
  const perPage = 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = svc
    .from("households")
    .select("id, name, created_by, created_at, subscription_status, trial_ends_at, subscription_started_at", { count: "exact" })
    .range(from, to);

  if (search) query = query.ilike("name", `%${search}%`);

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "trial_ending") {
    query = query.eq("subscription_status", "trial").order("trial_ends_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: households, count } = await query;

  if (!households) return NextResponse.json({ households: [], total: 0 });

  const withStats = await Promise.all(
    households.map(async (h) => {
      const [{ count: memberCount }, { count: peopleCount }, { data: owner }] =
        await Promise.all([
          svc.from("household_members").select("*", { count: "exact", head: true }).eq("household_id", h.id),
          svc.from("people").select("*", { count: "exact", head: true }).eq("household_id", h.id),
          svc.from("profiles").select("full_name, email").eq("id", h.created_by).maybeSingle(),
        ]);

      const daysLeft = h.subscription_status === "trial" && h.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(h.trial_ends_at).getTime() - Date.now()) / 86400000))
        : null;

      return {
        ...h,
        member_count: memberCount ?? 0,
        people_count: peopleCount ?? 0,
        owner_name: owner?.full_name ?? null,
        owner_email: owner?.email ?? null,
        trial_days_left: daysLeft,
      };
    })
  );

  return NextResponse.json({ households: withStats, total: count ?? 0 });
}
