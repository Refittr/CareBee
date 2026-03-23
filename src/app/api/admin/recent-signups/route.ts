import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { data: profiles } = await svc
    .from("profiles")
    .select("id, full_name, email, account_type, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!profiles) return NextResponse.json([]);

  // Get household count for each user
  const withHouseholds = await Promise.all(
    profiles.map(async (p) => {
      const { count } = await svc
        .from("household_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id);
      return { ...p, household_count: count ?? 0 };
    })
  );

  return NextResponse.json(withHouseholds);
}
