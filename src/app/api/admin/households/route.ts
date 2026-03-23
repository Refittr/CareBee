import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = svc
    .from("households")
    .select("id, name, created_by, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: households, count } = await query;

  if (!households) return NextResponse.json({ households: [], total: 0 });

  const withStats = await Promise.all(
    households.map(async (h) => {
      const [{ count: memberCount }, { count: peopleCount }, { data: owner }] =
        await Promise.all([
          svc
            .from("household_members")
            .select("*", { count: "exact", head: true })
            .eq("household_id", h.id),
          svc
            .from("people")
            .select("*", { count: "exact", head: true })
            .eq("household_id", h.id),
          svc
            .from("profiles")
            .select("full_name, email")
            .eq("id", h.created_by)
            .maybeSingle(),
        ]);
      return {
        ...h,
        member_count: memberCount ?? 0,
        people_count: peopleCount ?? 0,
        owner_name: owner?.full_name ?? null,
        owner_email: owner?.email ?? null,
      };
    })
  );

  return NextResponse.json({ households: withStats, total: count ?? 0 });
}
