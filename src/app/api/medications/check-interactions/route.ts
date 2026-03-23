import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { InteractionSeverity, InteractionStatus } from "@/lib/types/database";

const SYSTEM_PROMPT = `You are a drug interaction checker for CareBee, a UK family health and care record app. You are given a person's complete current medication list. Check for known interactions between any pair of medications.

You are NOT giving medical advice. You are flagging known pharmacological interactions that the family should raise with their GP or pharmacist.

CURRENT MEDICATIONS:
{MEDICATIONS}

Check every pair of medications for known interactions. Consider:
- Direct pharmacological interactions
- Additive effects (two drugs that both lower blood pressure, both cause drowsiness, both thin blood, etc.)
- Contraindications
- Monitoring requirements
- Duplicate therapy

Respond with a JSON array of interactions found:

[
  {
    "medication_a": "drug name",
    "medication_b": "drug name",
    "severity": "severe",
    "description": "Plain English explanation of the interaction.",
    "recommendation": "What the family should do.",
    "mechanism": "Brief plain English explanation of why the interaction occurs."
  }
]

SEVERITY LEVELS:
- severe: Generally considered dangerous or contraindicated. Contact GP promptly.
- moderate: May cause problems or require monitoring. Worth raising at next appointment.
- mild: Minor potential effects. Good to be aware of but not urgent.

RULES:
- Only flag genuine, well-established interactions. Do not speculate.
- If no interactions are found, return an empty array [].
- Use plain English throughout.
- Be specific about what the interaction does.
- Never use em dashes or en dashes. Use commas, full stops, or colons instead.
- Do not flag food interactions unless critical (e.g. warfarin and vitamin K, MAOIs and tyramine).
- Maximum 10 interactions. Focus on the most clinically significant ones.
- Return ONLY a valid JSON array. No other text.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();
  const { person_id, household_id } = body as { person_id: string; household_id: string };

  if (!person_id || !household_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const svc = await createServiceClient();

  // Verify membership (owner or editor)
  const { data: membership } = await svc
    .from("household_members")
    .select("role")
    .eq("household_id", household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "editor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load active medications
  const { data: medications } = await svc
    .from("medications")
    .select("name, dosage, frequency, purpose")
    .eq("person_id", person_id)
    .eq("is_active", true);

  if (!medications || medications.length < 2) {
    // No interactions possible with 0 or 1 medication
    return NextResponse.json({ interactions: [] });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let responseText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: SYSTEM_PROMPT.replace("{MEDICATIONS}", JSON.stringify(medications, null, 2)),
      }],
    });
    const block = message.content[0];
    responseText = block.type === "text" ? block.text : "[]";
  } catch (err) {
    console.error("[check-interactions] Anthropic error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }

  let found: Array<{
    medication_a: string;
    medication_b: string;
    severity: string;
    description: string;
    recommendation: string;
    mechanism?: string;
  }>;

  try {
    let json = responseText.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
    found = JSON.parse(json);
    if (!Array.isArray(found)) found = [];
  } catch {
    found = [];
  }

  // Clear old active interactions for this person, replace with new results
  await svc.from("drug_interactions").delete().eq("person_id", person_id).eq("status", "active");

  if (found.length > 0) {
    await svc.from("drug_interactions").insert(
      found.map((f) => ({
        person_id,
        household_id,
        medication_a: f.medication_a,
        medication_b: f.medication_b,
        severity: f.severity as InteractionSeverity,
        description: f.description,
        recommendation: f.recommendation,
        mechanism: f.mechanism ?? null,
        status: "active" as InteractionStatus,
      }))
    );
  }

  // Return all current interactions (active + acknowledged)
  const { data: all } = await svc
    .from("drug_interactions")
    .select("*")
    .eq("person_id", person_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ interactions: all ?? [] });
}
