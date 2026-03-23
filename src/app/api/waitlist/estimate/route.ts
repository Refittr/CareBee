import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a waiting list estimator for CareBee, a UK family health and care record app. You are given NHS referral details. Estimate typical waiting times and flag if a wait appears overdue.

These are estimates only based on your knowledge of typical NHS waiting times. Actual waits vary significantly. Always advise the family to contact the trust directly for their specific position.

WAIT STATUS DEFINITIONS:
- within_range: Wait is within the typical range for this specialty. No action needed.
- approaching_limit: Getting close to the 18-week RTT target or typical upper range. Worth monitoring.
- overdue: Beyond the 18-week target or clearly longer than typical. Should chase.
- significantly_overdue: Well beyond expected times. Escalate to PALS.

TYPICAL UK WAIT RANGES BY SPECIALTY:
Cardiology: 8 to 18 weeks | Orthopaedics: 12 to 26 weeks | Dermatology: 8 to 16 weeks
ENT: 10 to 20 weeks | Ophthalmology: 8 to 18 weeks | Gastroenterology: 8 to 18 weeks
Neurology: 12 to 24 weeks | Urology: 8 to 18 weeks | Rheumatology: 10 to 20 weeks
Pain clinic: 16 to 30 weeks | Physiotherapy: 6 to 14 weeks | Mental health/CAMHS: 12 to 52 weeks
Speech therapy: 8 to 26 weeks

The 18-week RTT target is the NHS constitutional standard for routine referrals.

RULES:
- Never use em dashes or en dashes.
- Be reassuring where waits are within range. Be clear and actionable where overdue.
- Return ONLY a valid JSON array. No other text.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { person_id, household_id } = await request.json() as { person_id: string; household_id: string };
  if (!person_id || !household_id)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const svc = await createServiceClient();

  const { data: membership } = await svc.from("household_members").select("role")
    .eq("household_id", household_id).eq("user_id", user.id).maybeSingle();
  if (!membership || (membership.role !== "owner" && membership.role !== "editor"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: entries } = await svc.from("waiting_lists")
    .select("*").eq("person_id", person_id).eq("status", "waiting");

  if (!entries || entries.length === 0)
    return NextResponse.json({ waiting_lists: [] });

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });

  const today = new Date();
  const enriched = entries.map((e) => {
    const refDate = new Date(e.referral_date);
    const weeksWaiting = Math.floor((today.getTime() - refDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return { ...e, weeks_waiting: weeksWaiting };
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `TODAY: ${today.toISOString().split("T")[0]}

WAITING LIST ENTRIES:
${JSON.stringify(enriched, null, 2)}

For each entry return a JSON array object with:
{
  "waiting_list_id": "id",
  "estimated_typical_wait_weeks": number,
  "wait_status": "within_range|approaching_limit|overdue|significantly_overdue",
  "explanation": "clear explanation for the family",
  "action_suggestion": "specific action to take if needed, or null",
  "chase_recommended": boolean
}`;

  let results: {
    waiting_list_id: string;
    estimated_typical_wait_weeks: number;
    wait_status: string;
    explanation: string;
    action_suggestion: string | null;
    chase_recommended: boolean;
  }[] = [];

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = msg.content[0];
    if (block.type === "text") {
      const json = block.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
      results = JSON.parse(json);
      if (!Array.isArray(results)) results = [];
    }
  } catch (err) {
    console.error("[waitlist/estimate] error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }

  const now = new Date().toISOString();
  for (const r of results) {
    await svc.from("waiting_lists").update({
      estimated_weeks: r.estimated_typical_wait_weeks,
      wait_status: r.wait_status as import("@/lib/types/database").WaitStatus,
      estimate_details: r.explanation,
      action_suggestion: r.action_suggestion,
      chase_recommended: r.chase_recommended,
      last_estimated_at: now,
      updated_at: now,
    }).eq("id", r.waiting_list_id);
  }

  const { data: updated } = await svc.from("waiting_lists")
    .select("*").eq("person_id", person_id).eq("status", "waiting");

  return NextResponse.json({ waiting_lists: updated ?? [] });
}
