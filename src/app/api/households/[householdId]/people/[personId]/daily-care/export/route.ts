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

  let query = svc
    .from("daily_care_records")
    .select("*, profiles!recorded_by(full_name)")
    .eq("person_id", personId)
    .order("record_date", { ascending: false });

  if (from) query = query.gte("record_date", from);
  if (to) query = query.lte("record_date", to);
  if (shift) query = query.eq("shift", shift as DailyCareShift);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = [
    "Date", "Shift", "Recorded by",
    "Mood", "Mood notes",
    "Personal care", "Personal care notes",
    "Breakfast", "Lunch", "Dinner", "Hydration", "Meals notes",
    "Mobility notes",
    "Medication given", "Medication notes",
    "Sleep notes", "Observations", "Concerns", "Follow-up needed",
    "Created at",
  ];

  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"` : str;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).map((r: any) => [
    r.record_date, r.shift, r.profiles?.full_name ?? "",
    r.mood, r.mood_notes,
    r.personal_care, r.personal_care_notes,
    r.breakfast, r.lunch, r.dinner, r.hydration, r.meals_notes,
    r.mobility_notes,
    r.medication_given, r.medication_notes,
    r.sleep_notes, r.observations, r.concerns,
    r.follow_up_needed ? "Yes" : "No",
    r.created_at,
  ].map(escape).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const fromLabel = from ?? "all";
  const toLabel = to ?? "time";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="daily-care-${fromLabel}-to-${toLabel}.csv"`,
    },
  });
}
