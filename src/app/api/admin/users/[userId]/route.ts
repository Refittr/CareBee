import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import type { AccountType } from "@/lib/types/database";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { userId } = await params;
  const body = await request.json();
  const { full_name, email, account_type } = body as {
    full_name?: string;
    email?: string;
    account_type?: AccountType;
  };

  const profileUpdate: Record<string, unknown> = {};
  if (full_name !== undefined) profileUpdate.full_name = full_name.trim();
  if (account_type !== undefined) profileUpdate.account_type = account_type;
  if (email !== undefined) profileUpdate.email = email.trim().toLowerCase();

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await svc.from("profiles").update(profileUpdate).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (email !== undefined) {
    const { error } = await svc.auth.admin.updateUserById(userId, {
      email: email.trim().toLowerCase(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc, userId: adminId } = auth;

  const { userId } = await params;

  if (userId === adminId) {
    return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  // Step 1: Collect owned household IDs
  const { data: ownedMemberships, error: ownedErr } = await svc
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .eq("role", "owner");

  if (ownedErr) {
    return NextResponse.json({ error: `Failed to fetch owned households: ${ownedErr.message}` }, { status: 500 });
  }

  const ownedHouseholdIds = (ownedMemberships ?? []).map((m) => m.household_id as string);

  // Step 2: Collect all person IDs in owned households
  let personIds: string[] = [];
  if (ownedHouseholdIds.length > 0) {
    const { data: people, error: peopleErr } = await svc
      .from("people")
      .select("id")
      .in("household_id", ownedHouseholdIds);

    if (peopleErr) {
      return NextResponse.json({ error: `Failed to fetch people: ${peopleErr.message}` }, { status: 500 });
    }
    personIds = (people ?? []).map((p) => p.id as string);
  }

  // Helper: delete with error reporting
  async function del(table: string, column: string, ids: string[]): Promise<string | null> {
    if (ids.length === 0) return null;
    const { error } = await svc.from(table as "profiles").delete().in(column, ids);
    return error ? `${table}: ${error.message}` : null;
  }

  async function delEq(table: string, column: string, value: string): Promise<string | null> {
    const { error } = await svc.from(table as "profiles").delete().eq(column, value);
    return error ? `${table}: ${error.message}` : null;
  }

  // Step 3: Delete person-level data (deepest dependencies first)
  if (personIds.length > 0) {
    // medication_changes references medications.id, so delete before medications
    const { data: medications } = await svc
      .from("medications")
      .select("id")
      .in("person_id", personIds);
    const medicationIds = (medications ?? []).map((m) => m.id as string);
    const err1 = await del("medication_changes", "medication_id", medicationIds);
    if (err1) return NextResponse.json({ error: err1 }, { status: 500 });

    // appointment_preps and appointment_debriefs reference appointments.id
    const { data: appointments } = await svc
      .from("appointments")
      .select("id")
      .in("person_id", personIds);
    const appointmentIds = (appointments ?? []).map((a) => a.id as string);
    const err2 = await del("appointment_preps", "appointment_id", appointmentIds);
    if (err2) return NextResponse.json({ error: err2 }, { status: 500 });
    const err3 = await del("appointment_debriefs", "appointment_id", appointmentIds);
    if (err3) return NextResponse.json({ error: err3 }, { status: 500 });

    // Now delete the person-level tables
    const personTables: [string, string][] = [
      ["insight_checks", "person_id"],
      ["health_insights", "person_id"],
      ["drug_interactions", "person_id"],
      ["entitlements", "person_id"],
      ["documents", "person_id"],
      ["medications", "person_id"],
      ["conditions", "person_id"],
      ["allergies", "person_id"],
      ["appointments", "person_id"],
      ["test_results", "person_id"],
      ["waiting_lists", "person_id"],
      ["contacts", "person_id"],
      ["generated_letters", "person_id"],
      ["care_notes", "person_id"],
      ["emergency_shares", "person_id"],
    ];

    for (const [table, col] of personTables) {
      const err = await del(table, col, personIds);
      if (err) return NextResponse.json({ error: err }, { status: 500 });
    }

    // Delete people themselves
    const err4 = await del("people", "id", personIds);
    if (err4) return NextResponse.json({ error: err4 }, { status: 500 });
  }

  // Step 4: Household-level data
  if (ownedHouseholdIds.length > 0) {
    const householdTables: [string, string][] = [
      ["invitations", "household_id"],
      ["household_members", "household_id"],
    ];
    for (const [table, col] of householdTables) {
      const err = await del(table, col, ownedHouseholdIds);
      if (err) return NextResponse.json({ error: err }, { status: 500 });
    }
    const err5 = await del("households", "id", ownedHouseholdIds);
    if (err5) return NextResponse.json({ error: err5 }, { status: 500 });
  }

  // Step 5: User-level data (logs and memberships in other households)
  const userTables: [string, string][] = [
    ["api_usage_log", "user_id"],
    ["page_view_log", "user_id"],
    ["feature_usage_log", "user_id"],
    ["error_log", "user_id"],
    ["digest_logs", "user_id"],
    ["admin_activity_log", "user_id"],
    ["household_members", "user_id"], // memberships in other households
  ];
  for (const [table, col] of userTables) {
    const err = await delEq(table, col, userId);
    if (err) return NextResponse.json({ error: err }, { status: 500 });
  }

  // Step 6: Profile row (NOTE: intentionally leave stripe_customer_id data in Stripe)
  const err6 = await delEq("profiles", "id", userId);
  if (err6) return NextResponse.json({ error: err6 }, { status: 500 });

  // Step 7: Delete from Supabase Auth
  const { error: authErr } = await svc.auth.admin.deleteUser(userId);
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
