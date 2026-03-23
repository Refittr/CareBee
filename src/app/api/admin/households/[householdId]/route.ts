import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { householdId } = await params;

  const [{ data: household }, { data: members }, { data: people }] =
    await Promise.all([
      svc
        .from("households")
        .select("id, name, created_at")
        .eq("id", householdId)
        .maybeSingle(),
      svc
        .from("household_members")
        .select("id, user_id, role, accepted_at, invited_email")
        .eq("household_id", householdId),
      svc
        .from("people")
        .select("id, first_name, last_name, date_of_birth")
        .eq("household_id", householdId),
    ]);

  if (!household) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Enrich members with profile data
  const membersWithProfiles = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: profile } = await svc
        .from("profiles")
        .select("full_name, email")
        .eq("id", m.user_id)
        .maybeSingle();
      return { ...m, full_name: profile?.full_name, email: profile?.email };
    })
  );

  // Get counts per person
  const peopleWithCounts = await Promise.all(
    (people ?? []).map(async (p) => {
      const [{ count: condCount }, { count: medCount }, { count: docCount }] =
        await Promise.all([
          svc
            .from("conditions")
            .select("*", { count: "exact", head: true })
            .eq("person_id", p.id),
          svc
            .from("medications")
            .select("*", { count: "exact", head: true })
            .eq("person_id", p.id)
            .eq("is_active", true),
          svc
            .from("documents")
            .select("*", { count: "exact", head: true })
            .eq("person_id", p.id),
        ]);
      return {
        ...p,
        conditions_count: condCount ?? 0,
        medications_count: medCount ?? 0,
        documents_count: docCount ?? 0,
      };
    })
  );

  return NextResponse.json({
    household,
    members: membersWithProfiles,
    people: peopleWithCounts,
  });
}
