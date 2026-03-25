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
    .select("name, subscription_status, trial_ends_at")
    .eq("id", householdId)
    .maybeSingle();

  if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If trial already active, extend from current end; otherwise reset from now
  const base = household.subscription_status === "trial" && household.trial_ends_at && new Date(household.trial_ends_at) > new Date()
    ? new Date(household.trial_ends_at)
    : new Date();
  base.setDate(base.getDate() + 30);

  await svc.from("households").update({
    subscription_status: "trial",
    trial_ends_at: base.toISOString(),
  }).eq("id", householdId);

  await svc.from("admin_activity_log").insert({
    user_id: userId,
    action: "admin_extend_trial",
    entity_type: "household",
    entity_id: householdId,
    metadata: { household_name: household.name, new_trial_ends_at: base.toISOString() },
  });

  return NextResponse.json({ ok: true, trial_ends_at: base.toISOString() });
}
