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
    .from("profiles")
    .select("id, full_name, email, account_type, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: profiles, count } = await query;

  if (!profiles) return NextResponse.json({ users: [], total: 0 });

  const withStats = await Promise.all(
    profiles.map(async (p) => {
      const [{ count: householdCount }, { count: peopleCount }] =
        await Promise.all([
          svc
            .from("household_members")
            .select("*", { count: "exact", head: true })
            .eq("user_id", p.id),
          svc
            .from("people")
            .select("*", { count: "exact", head: true })
            .eq("household_id", p.id),
        ]);
      return {
        ...p,
        household_count: householdCount ?? 0,
        people_count: peopleCount ?? 0,
      };
    })
  );

  return NextResponse.json({ users: withStats, total: count ?? 0 });
}
