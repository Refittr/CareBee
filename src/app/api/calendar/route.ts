import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type {
  CalendarAppointment,
  CalendarMedication,
  CalendarTakenEntry,
  CalendarEntitlementReview,
  CalendarRepeatPrescription,
  CalendarPerson,
} from "@/components/calendar/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const householdId = searchParams.get("householdId");
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const personId = searchParams.get("personId");

  if (!householdId || !yearParam || !monthParam) {
    return NextResponse.json({ error: "Missing required params" }, { status: 400 });
  }

  const year = parseInt(yearParam, 10);
  const month = parseInt(monthParam, 10); // 1-12

  // Auth check
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

  // Date range for the month
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0); // last day of month
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  const startOfNextMonth = new Date(year, month, 1).toISOString();
  const startOfMonthISO = new Date(year, month - 1, 1).toISOString();

  // Base filter: household, optionally scoped to a single person
  const personFilter = personId
    ? (q: ReturnType<typeof svc.from>) => (q as any).eq("person_id", personId)
    : (q: ReturnType<typeof svc.from>) => q;

  const [
    { data: peopleRows },
    { data: apptRows },
    { data: medRows },
    { data: reviewRows },
    { data: rxRows },
  ] = await Promise.all([
    // People in this household (or just the one person)
    personId
      ? svc.from("people").select("id, first_name, last_name").eq("id", personId)
      : svc.from("people").select("id, first_name, last_name").eq("household_id", householdId),

    // Appointments in the month (not cancelled)
    (() => {
      let q = svc
        .from("appointments")
        .select("id, title, appointment_date, location, professional_name, department, status, person_id")
        .eq("household_id", householdId)
        .neq("status", "cancelled")
        .gte("appointment_date", startOfMonthISO)
        .lt("appointment_date", startOfNextMonth);
      if (personId) q = q.eq("person_id", personId);
      return q;
    })(),

    // Scheduled active medications whose date range overlaps the month
    (() => {
      let q = svc
        .from("medications")
        .select("id, name, dosage, purpose, schedule_type, times_per_day, start_date, end_date, person_id")
        .eq("household_id", householdId)
        .not("schedule_type", "is", null)
        .eq("is_active", true)
        .or(`start_date.is.null,start_date.lte.${endOfMonth}`)
        .or(`end_date.is.null,end_date.gte.${startOfMonth}`);
      if (personId) q = q.eq("person_id", personId);
      return q;
    })(),

    // Entitlements with review_date in the month
    (() => {
      let q = svc
        .from("entitlements")
        .select("id, benefit_name, review_date, person_id")
        .eq("household_id", householdId)
        .gte("review_date", startOfMonth)
        .lte("review_date", endOfMonth);
      if (personId) q = q.eq("person_id", personId);
      return q;
    })(),

    // Repeat prescription dates in the month
    (() => {
      let q = svc
        .from("medications")
        .select("id, name, repeat_prescription_date, person_id")
        .eq("household_id", householdId)
        .not("repeat_prescription_date", "is", null)
        .gte("repeat_prescription_date", startOfMonth)
        .lte("repeat_prescription_date", endOfMonth);
      if (personId) q = q.eq("person_id", personId);
      return q;
    })(),
  ]);

  // Fetch medication schedules for the active scheduled meds
  const medIds = (medRows ?? []).map((m) => m.id as string);
  const { data: scheduleRows } = medIds.length > 0
    ? await svc
        .from("medication_schedules")
        .select("id, medication_id, time")
        .in("medication_id", medIds)
        .order("time")
    : { data: [] as Array<{ id: string; medication_id: string; time: string }> };

  // Fetch taken log for the month
  const { data: takenRows } = medIds.length > 0
    ? await svc
        .from("medication_taken_log")
        .select("id, medication_id, schedule_id, taken_date, taken")
        .in("medication_id", medIds)
        .gte("taken_date", startOfMonth)
        .lte("taken_date", endOfMonth)
    : { data: [] as Array<{ id: string; medication_id: string; schedule_id: string | null; taken_date: string; taken: boolean }> };

  // Build response
  const people: CalendarPerson[] = (peopleRows ?? []).map((p) => ({
    id: p.id as string,
    first_name: p.first_name as string,
    last_name: p.last_name as string,
  }));

  const appointments: CalendarAppointment[] = (apptRows ?? []).map((a) => ({
    id: a.id as string,
    title: a.title as string,
    appointment_date: a.appointment_date as string,
    location: (a.location as string | null) ?? null,
    professional_name: (a.professional_name as string | null) ?? null,
    department: (a.department as string | null) ?? null,
    status: a.status as string,
    person_id: a.person_id as string,
  }));

  const schedulesByMed: Record<string, { id: string; time: string }[]> = {};
  for (const s of scheduleRows ?? []) {
    const mid = s.medication_id as string;
    if (!schedulesByMed[mid]) schedulesByMed[mid] = [];
    schedulesByMed[mid].push({ id: s.id as string, time: s.time as string });
  }

  const medications: CalendarMedication[] = (medRows ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    dosage: (m.dosage as string | null) ?? null,
    purpose: (m.purpose as string | null) ?? null,
    schedule_type: m.schedule_type as "specific_times" | "times_per_day",
    times_per_day: (m.times_per_day as number | null) ?? null,
    start_date: (m.start_date as string | null) ?? null,
    end_date: (m.end_date as string | null) ?? null,
    person_id: m.person_id as string,
    schedules: schedulesByMed[m.id as string] ?? [],
  }));

  const taken_log: CalendarTakenEntry[] = (takenRows ?? []).map((t) => ({
    id: t.id as string,
    medication_id: t.medication_id as string,
    schedule_id: (t.schedule_id as string | null) ?? null,
    taken_date: t.taken_date as string,
    taken: t.taken as boolean,
  }));

  const entitlement_reviews: CalendarEntitlementReview[] = (reviewRows ?? [])
    .filter((r) => r.review_date)
    .map((r) => ({
      id: r.id as string,
      benefit_name: r.benefit_name as string,
      review_date: r.review_date as string,
      person_id: r.person_id as string,
    }));

  const repeat_prescriptions: CalendarRepeatPrescription[] = (rxRows ?? [])
    .filter((r) => r.repeat_prescription_date)
    .map((r) => ({
      id: r.id as string,
      name: r.name as string,
      repeat_prescription_date: r.repeat_prescription_date as string,
      person_id: r.person_id as string,
    }));

  return NextResponse.json({
    people,
    appointments,
    medications,
    taken_log,
    entitlement_reviews,
    repeat_prescriptions,
  });
}
