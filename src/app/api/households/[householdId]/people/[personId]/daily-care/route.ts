import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { DailyCareShift } from "@/lib/types/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; personId: string }> }
) {
  const { householdId, personId } = await params;

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
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const shift = searchParams.get("shift");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = 20;

  let query = svc
    .from("daily_care_records")
    .select("*, profiles!recorded_by(full_name)", { count: "exact" })
    .eq("person_id", personId)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (from) query = query.gte("record_date", from);
  if (to) query = query.lte("record_date", to);
  if (shift) query = query.eq("shift", shift as DailyCareShift);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = (data ?? []).map((r: any) => ({
    ...r,
    recorded_by_name: r.profiles?.full_name ?? null,
    profiles: undefined,
  }));

  return NextResponse.json({ records, total: count ?? 0, page, perPage });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; personId: string }> }
) {
  const { householdId, personId } = await params;

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
  if (!membership || membership.role === "viewer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  const { data, error } = await svc
    .from("daily_care_records")
    .insert({
      ...body,
      person_id: personId,
      household_id: householdId,
      recorded_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
