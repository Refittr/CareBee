import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc, userId } = auth;

  const { householdId } = await params;

  const { data: household } = await svc
    .from("households")
    .select("name")
    .eq("id", householdId)
    .maybeSingle();

  if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await svc.from("households").update({
    subscription_status: "active",
    subscription_started_at: new Date().toISOString(),
  }).eq("id", householdId);

  await svc.from("admin_activity_log").insert({
    user_id: userId,
    action: "admin_grant_plus",
    entity_type: "household",
    entity_id: householdId,
    metadata: { household_name: household.name },
  });

  return NextResponse.json({ ok: true });
}
