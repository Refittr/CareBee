import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { trackApiCall } from "@/lib/analytics-server";

const SYSTEM_PROMPT = `You are analysing an appointment debrief for CareBee, a UK family health and care record app. The family member has recorded what happened at a medical appointment. Your job is to identify missing information and suggest specific updates to the person's health record.

RULES:
- Only suggest updates for things clearly mentioned in the debrief. Do not infer or speculate.
- If the debrief is vague, ask for clarification in missing_info_prompts rather than guessing.
- Use the person's actual name in all prompts and descriptions.
- Keep prompts friendly and non-pressuring.
- Never use em dashes or en dashes.
- If the debrief mentions nothing actionable, return empty arrays. Do not force suggestions.

Respond with JSON only:
{
  "missing_info_prompts": [
    { "field": "field_name", "prompt": "Friendly prompt asking for clarification" }
  ],
  "suggested_updates": [
    {
      "type": "add_medication|stop_medication|add_referral|add_appointment|add_condition",
      "description": "Plain English description of the update",
      "data": {}
    }
  ]
}`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json() as {
    appointment_id: string;
    person_id: string;
    household_id: string;
    debrief: {
      summary?: string;
      medication_changes: boolean;
      medication_change_details?: string;
      new_referrals: boolean;
      new_referral_details?: string;
      tests_ordered: boolean;
      test_details?: string;
      next_appointment?: string;
      concerns?: string;
    };
  };

  const { appointment_id, person_id, household_id, debrief } = body;
  if (!appointment_id || !person_id || !household_id)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const svc = await createServiceClient();

  const { data: membership } = await svc.from("household_members").select("role")
    .eq("household_id", household_id).eq("user_id", user.id).maybeSingle();
  if (!membership || (membership.role !== "owner" && membership.role !== "editor"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date().toISOString();

  // Upsert debrief record
  const { data: existing } = await svc.from("appointment_debriefs")
    .select("id").eq("appointment_id", appointment_id).maybeSingle();

  let debriefRecord;
  if (existing) {
    const { data } = await svc.from("appointment_debriefs").update({
      ...debrief,
      updated_at: now,
    }).eq("id", existing.id).select().single();
    debriefRecord = data;
  } else {
    const { data } = await svc.from("appointment_debriefs").insert({
      appointment_id,
      person_id,
      household_id,
      ...debrief,
    }).select().single();
    debriefRecord = data;
  }

  if (!debriefRecord) return NextResponse.json({ error: "Could not save debrief" }, { status: 500 });

  // Skip AI if nothing substantial was written
  const hasContent = debrief.summary || debrief.medication_change_details || debrief.new_referral_details || debrief.test_details || debrief.next_appointment || debrief.concerns;
  if (!hasContent || !process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ debrief: debriefRecord, missing_info_prompts: [], suggested_updates: [] });

  const [{ data: appt }, { data: person }, { data: conditions }, { data: medications }] = await Promise.all([
    svc.from("appointments").select("title, department, appointment_date, professional_name").eq("id", appointment_id).single(),
    svc.from("people").select("first_name, last_name").eq("id", person_id).single(),
    svc.from("conditions").select("name").eq("person_id", person_id).eq("is_active", true),
    svc.from("medications").select("name, is_active").eq("person_id", person_id),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const personName = person ? `${person.first_name} ${person.last_name}` : "the person";

  const userMessage = `PERSON'S NAME: ${personName}
TODAY: ${today}
APPOINTMENT: ${JSON.stringify(appt)}

DEBRIEF:
Summary: ${debrief.summary ?? "not provided"}
Medication changes: ${debrief.medication_changes} - ${debrief.medication_change_details ?? "no details"}
New referrals: ${debrief.new_referrals} - ${debrief.new_referral_details ?? "no details"}
Tests ordered: ${debrief.tests_ordered} - ${debrief.test_details ?? "no details"}
Next appointment: ${debrief.next_appointment ?? "not mentioned"}
Concerns: ${debrief.concerns ?? "none"}

CURRENT CONDITIONS: ${conditions?.map((c) => c.name).join(", ") ?? "none"}
CURRENT MEDICATIONS: ${medications?.map((m) => `${m.name} (${m.is_active ? "active" : "stopped"})`).join(", ") ?? "none"}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let missing_info_prompts: { field: string; prompt: string }[] = [];
  let suggested_updates: Record<string, unknown>[] = [];

  const aiStart = Date.now();
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    void trackApiCall({ userId: user.id, feature: "appointment_debrief", action: "debrief_analysed", status: "success", tokensUsed: (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0), durationMs: Date.now() - aiStart });
    const block = msg.content[0];
    if (block.type === "text") {
      const json = block.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
      const parsed = JSON.parse(json);
      missing_info_prompts = parsed.missing_info_prompts ?? [];
      suggested_updates = parsed.suggested_updates ?? [];
    }
  } catch (err) {
    console.error("[appointments/debrief] AI error:", err);
    void trackApiCall({ userId: user.id, feature: "appointment_debrief", action: "debrief_failed", status: "error", errorMessage: String(err), durationMs: Date.now() - aiStart });
    // Non-fatal: return debrief without suggestions
  }

  // Store suggestions back on the debrief
  if (suggested_updates.length > 0) {
    await svc.from("appointment_debriefs").update({ suggested_updates, updated_at: now }).eq("id", debriefRecord.id);
  }

  return NextResponse.json({ debrief: debriefRecord, missing_info_prompts, suggested_updates });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appointment_id = searchParams.get("appointment_id");
  if (!appointment_id) return NextResponse.json({ error: "Missing appointment_id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const svc = await createServiceClient();
  const { data } = await svc.from("appointment_debriefs")
    .select("*").eq("appointment_id", appointment_id).maybeSingle();

  return NextResponse.json({ debrief: data ?? null });
}
