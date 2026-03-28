import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; personId: string; recordId: string }> }
) {
  const { householdId, recordId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const svc = await createServiceClient();

  const { data: record } = await svc
    .from("daily_care_records")
    .select("recorded_by")
    .eq("id", recordId)
    .maybeSingle();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await svc
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = membership?.role === "owner";
  const isAuthor = (record as { recorded_by: string }).recorded_by === user.id;
  if (!isOwner && !isAuthor)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { id: _id, person_id: _p, household_id: _h, recorded_by: _r, created_at: _c, ...updates } = body;

  const { data, error } = await svc
    .from("daily_care_records")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", recordId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ householdId: string; personId: string; recordId: string }> }
) {
  const { householdId, recordId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const svc = await createServiceClient();

  const { data: membership } = await svc
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.role !== "owner")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await svc
    .from("daily_care_records")
    .delete()
    .eq("id", recordId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
