import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Shared helpers (duplicated from generate route to keep routes independent)

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

async function buildPersonSection(
  svc: Awaited<ReturnType<typeof createServiceClient>>,
  person: { id: string; first_name: string; last_name: string },
  since: string
): Promise<string> {
  const personId = person.id;
  const name = `${person.first_name} ${person.last_name}`;

  const [
    { data: conditions },
    { data: medications },
    { data: appointments },
    { data: testResults },
    { data: insights },
    { data: interactions },
    { data: waitingLists },
    { data: entitlements },
    { data: documents },
  ] = await Promise.all([
    svc.from("conditions").select("name, is_active, created_at").eq("person_id", personId).gte("created_at", since),
    svc.from("medications").select("name, dosage, is_active, created_at").eq("person_id", personId).gte("created_at", since),
    svc.from("appointments").select("title, appointment_date, status, department").eq("person_id", personId).gte("created_at", since),
    svc.from("test_results").select("test_name, result_value, result_date, is_abnormal").eq("person_id", personId).gte("created_at", since),
    svc.from("health_insights").select("title, description, priority").eq("person_id", personId).gte("created_at", since),
    svc.from("drug_interactions").select("medication_a, medication_b, severity").eq("person_id", personId).gte("created_at", since),
    svc.from("waiting_lists").select("department, wait_status, referral_date").eq("person_id", personId).gte("updated_at", since).eq("status", "waiting"),
    svc.from("entitlements").select("benefit_name, eligibility_status").eq("person_id", personId).gte("updated_at", since),
    svc.from("documents").select("file_name, created_at").eq("person_id", personId).gte("created_at", since),
  ]);

  const lines: string[] = [`--- ${name} ---`];
  let hasChanges = false;

  const newConditions = conditions?.filter((c) => c.created_at >= since) ?? [];
  if (newConditions.length > 0) {
    hasChanges = true;
    lines.push(`New conditions: ${newConditions.map((c) => c.name).join(", ")}`);
  }

  const newMeds = medications?.filter((m) => m.created_at >= since) ?? [];
  const stoppedMeds = newMeds.filter((m) => !m.is_active);
  const addedMeds = newMeds.filter((m) => m.is_active);
  if (addedMeds.length > 0) { hasChanges = true; lines.push(`Medications added: ${addedMeds.map((m) => `${m.name}${m.dosage ? " " + m.dosage : ""}`).join(", ")}`); }
  if (stoppedMeds.length > 0) { hasChanges = true; lines.push(`Medications stopped: ${stoppedMeds.map((m) => m.name).join(", ")}`); }

  const completedAppts = appointments?.filter((a) => a.status === "completed") ?? [];
  const upcomingAppts = appointments?.filter((a) => a.status === "upcoming") ?? [];
  if (completedAppts.length > 0) { hasChanges = true; lines.push(`Appointments attended: ${completedAppts.map((a) => `${a.title} (${formatDate(a.appointment_date)})`).join(", ")}`); }
  if (upcomingAppts.length > 0) { hasChanges = true; lines.push(`Upcoming appointments: ${upcomingAppts.map((a) => `${a.title} on ${formatDate(a.appointment_date)}`).join(", ")}`); }

  if ((testResults ?? []).length > 0) {
    hasChanges = true;
    lines.push(`New test results: ${testResults!.map((r) => `${r.test_name}${r.result_value ? ": " + r.result_value : ""}${r.is_abnormal ? " (abnormal)" : ""}`).join(", ")}`);
  }

  if ((insights ?? []).length > 0) {
    hasChanges = true;
    lines.push(`New health insights: ${insights!.map((i) => i.title).join(", ")}`);
  }

  if ((interactions ?? []).length > 0) {
    hasChanges = true;
    lines.push(`Drug interactions flagged: ${interactions!.map((i) => `${i.medication_a} and ${i.medication_b} (${i.severity})`).join(", ")}`);
  }

  if ((waitingLists ?? []).length > 0) {
    hasChanges = true;
    lines.push(`Waiting list updates: ${waitingLists!.map((w) => `${w.department} (${w.wait_status ?? "unknown status"})`).join(", ")}`);
  }

  if ((entitlements ?? []).length > 0) {
    hasChanges = true;
    lines.push(`Entitlement updates: ${entitlements!.map((e) => `${e.benefit_name} (${e.eligibility_status})`).join(", ")}`);
  }

  if ((documents ?? []).length > 0) {
    hasChanges = true;
    lines.push(`Documents uploaded or generated: ${documents!.map((d) => d.file_name).join(", ")}`);
  }

  if (!hasChanges) lines.push(`No changes this week for ${name}.`);

  return lines.join("\n");
}

// GET: return digest log history for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: logs } = await svc
    .from("digest_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ logs: logs ?? [] });
}

// POST: generate a preview digest for the current user and save to logs
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const svc = await createServiceClient();

  // Get user email
  const { data: profile } = await svc.from("profiles").select("email").eq("id", user.id).single();
  if (!profile?.email) return NextResponse.json({ error: "No email on profile" }, { status: 400 });

  // Get all their household memberships
  const { data: members } = await svc
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null);

  if (!members || members.length === 0) {
    return NextResponse.json({ error: "No care records found" }, { status: 400 });
  }

  const householdIds = members.map((m) => m.household_id);

  const today = new Date();
  const since = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateRange = `${formatDate(since)} to ${formatDate(today.toISOString())}`;

  // Get all people in these households
  const { data: people } = await svc
    .from("people")
    .select("id, first_name, last_name, household_id")
    .in("household_id", householdIds);

  if (!people || people.length === 0) {
    return NextResponse.json({ error: "No people in care records" }, { status: 400 });
  }

  const { data: households } = await svc.from("households").select("id, name").in("id", householdIds);
  const householdNames = new Map((households ?? []).map((h) => [h.id, h.name]));

  const allSections: string[] = [];

  const byHousehold = new Map<string, typeof people>();
  for (const p of people) {
    if (!byHousehold.has(p.household_id)) byHousehold.set(p.household_id, []);
    byHousehold.get(p.household_id)!.push(p);
  }

  for (const [hId, hPeople] of byHousehold.entries()) {
    if (householdIds.length > 1) allSections.push(`=== ${householdNames.get(hId) ?? "Care record"} ===`);
    for (const person of hPeople) {
      const section = await buildPersonSection(svc, person, since);
      allSections.push(section);
    }
  }

  const content_text = `CareBee weekly update: ${dateRange}\n\n${allSections.join("\n\n")}`;
  const subject = `CareBee weekly update: ${dateRange}`;

  // Save to digest_logs
  const { data: log, error: insertError } = await svc.from("digest_logs").insert({
    user_id: user.id,
    subject,
    content_text,
  }).select().single();

  if (insertError) {
    console.error("[digest/preview] Failed to save digest log:", insertError);
    return NextResponse.json({ error: "Failed to save update. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ log, content_text, subject, dateRange });
}
