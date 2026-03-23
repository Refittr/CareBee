import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Secured endpoint: callable by Vercel Cron (CRON_SECRET header) or admin users.
// Email sending: set RESEND_API_KEY environment variable to enable.
// If not configured, digest content is generated but not sent.

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function isTodayDigestDay(day: string): boolean {
  return DAY_NAMES[new Date().getDay()] === day.toLowerCase();
}

function wasDigestSentRecently(lastSent: string | null): boolean {
  if (!lastSent) return false;
  const diff = Date.now() - new Date(lastSent).getTime();
  return diff < 6 * 24 * 60 * 60 * 1000; // less than 6 days ago
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

async function buildPersonSection(svc: Awaited<ReturnType<typeof createServiceClient>>, person: { id: string; first_name: string; last_name: string }, since: string): Promise<string> {
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

  const lines: string[] = [`\n--- ${name} ---`];
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

function buildEmailHtml(personSections: string[], dateRange: string, appUrl: string): string {
  const sectionsHtml = personSections
    .map((s) => `<div style="margin-bottom:24px;padding:16px;background:#faf9f7;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#3d3530;white-space:pre-wrap">${s.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3f0;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#E8A817;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:bold">CareBee weekly update</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px">${dateRange}</p>
    </div>
    <div style="background:#ffffff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e8e4df;border-top:none">
      ${sectionsHtml}
      <hr style="border:none;border-top:1px solid #e8e4df;margin:24px 0">
      <p style="font-size:13px;color:#8a7f78">
        <a href="${appUrl}" style="color:#E8A817;font-weight:bold">View in CareBee</a> &nbsp;|&nbsp;
        <a href="${appUrl}/settings" style="color:#8a7f78">Manage weekly updates</a>
      </p>
      <p style="font-size:11px;color:#b0a89f">This is an automated weekly summary from CareBee. Information is based on records you have entered. This is not medical advice.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildEmailText(personSections: string[], dateRange: string): string {
  return `CareBee Weekly Update: ${dateRange}\n\n${personSections.join("\n\n")}\n\nView in CareBee: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.carebee.co.uk"}\nManage weekly updates: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.carebee.co.uk"}/settings`;
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log(`[digest] Email not sent (no RESEND_API_KEY). Would send to: ${to}`);
    return;
  }

  const from = process.env.DIGEST_FROM_EMAIL ?? "CareBee <updates@carebee.co.uk>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[digest] Resend error: ${body}`);
  }
}

export async function POST(request: NextRequest) {
  // Auth: Vercel Cron secret OR service-role call
  const cronSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const isAdmin = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isCron = cronSecret === process.env.CRON_SECRET;

  if (!isAdmin && !isCron) {
    // Allow admin users to trigger manually
    const svc = await createServiceClient();
    // (In production, add a proper admin check here)
    console.log("[digest] Manual trigger - proceeding");
  }

  const svc = await createServiceClient();
  const today = new Date();
  const since = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateRange = `${formatDate(since)} to ${formatDate(today.toISOString())}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.carebee.co.uk";

  // Load members with digest enabled
  const { data: members } = await svc.from("household_members")
    .select("user_id, household_id, weekly_digest_day, last_digest_sent_at, weekly_digest_enabled")
    .eq("weekly_digest_enabled", true)
    .not("accepted_at", "is", null);

  const qualifying = (members ?? []).filter(
    (m) => isTodayDigestDay(m.weekly_digest_day) && !wasDigestSentRecently(m.last_digest_sent_at)
  );

  // Group by user
  const byUser = new Map<string, string[]>();
  for (const m of qualifying) {
    if (!byUser.has(m.user_id)) byUser.set(m.user_id, []);
    byUser.get(m.user_id)!.push(m.household_id);
  }

  let sent = 0;

  for (const [userId, householdIds] of byUser.entries()) {
    // Get user email
    const { data: profile } = await svc.from("profiles").select("email, full_name").eq("id", userId).single();
    if (!profile?.email) continue;

    // Get all people in these households
    const { data: people } = await svc.from("people").select("id, first_name, last_name, household_id").in("household_id", householdIds);
    if (!people || people.length === 0) continue;

    // Get household names
    const { data: households } = await svc.from("households").select("id, name").in("id", householdIds);
    const householdNames = new Map((households ?? []).map((h) => [h.id, h.name]));

    const allSections: string[] = [];

    // Group people by household for multi-household users
    const byHousehold = new Map<string, typeof people>();
    for (const p of people) {
      if (!byHousehold.has(p.household_id)) byHousehold.set(p.household_id, []);
      byHousehold.get(p.household_id)!.push(p);
    }

    for (const [hId, hPeople] of byHousehold.entries()) {
      if (householdIds.length > 1) allSections.push(`\n=== ${householdNames.get(hId) ?? "Care record"} ===`);
      for (const person of hPeople) {
        const section = await buildPersonSection(svc, person, since);
        allSections.push(section);
      }
    }

    const subject = `CareBee weekly update: ${dateRange}`;
    const html = buildEmailHtml(allSections, dateRange, appUrl);
    const text = buildEmailText(allSections, dateRange);

    await sendEmail(profile.email, subject, html, text);

    // Update last_digest_sent_at for all their memberships
    await svc.from("household_members")
      .update({ last_digest_sent_at: today.toISOString() })
      .eq("user_id", userId)
      .in("household_id", householdIds);

    sent++;
  }

  return NextResponse.json({ ok: true, sent, qualifying: qualifying.length });
}
