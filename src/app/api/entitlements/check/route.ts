import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { trackApiCall } from "@/lib/analytics-server";
import { calculateAge } from "@/lib/utils/dates";
import type {
  EntitlementEligibilityStatus,
  EntitlementConfidence,
  EntitlementCategory,
  EntitlementCurrentStatus,
} from "@/lib/types/database";

const SYSTEM_PROMPT = `You are the entitlements engine for CareBee, a UK family health and care record app. You are given a person's health, care, and personal details. Your job is to check what UK benefits, grants, and support they are likely eligible for.

You must ONLY flag entitlements based on publicly available eligibility criteria. You are NOT a benefits adviser. Always note that formal advice should be sought from Citizens Advice or a qualified benefits adviser.

Check eligibility for ALL of the following (where relevant to the person's situation):

DISABILITY BENEFITS:
- Attendance Allowance (for people over state pension age who need help with personal care or supervision)
  - Lower rate: £72.65/week (needs help during day OR night)
  - Higher rate: £108.55/week (needs help during day AND night, or is terminally ill)
- Personal Independence Payment (PIP) (for people aged 16 to state pension age with a long-term health condition or disability)
  - Daily living component: standard (£72.65/week) or enhanced (£108.55/week)
  - Mobility component: standard (£28.70/week) or enhanced (£75.75/week)
- Disability Living Allowance (DLA) (for children under 16 with care or mobility needs)

CARER BENEFITS:
- Carer's Allowance (£81.90/week for someone caring 35+ hours/week for a person on AA, PIP daily living, or DLA middle/higher care)
- Carer's Credit (National Insurance credits for carers not eligible for Carer's Allowance)

FINANCIAL SUPPORT:
- Pension Credit (for people over state pension age on low income)
- Council Tax Reduction (25% to 100% for low income, disability, or living alone)
- Council Tax disability reduction (lower band if room used for disability needs)
- Disabled Facilities Grant (up to £30,000 for home adaptations)
- Winter Fuel Payment (automatic for people over state pension age)
- Cold Weather Payment (£25 per 7-day cold spell, if on certain benefits)
- Warm Home Discount (£150 off electricity bill)

HEALTH EXEMPTIONS:
- Free NHS prescriptions (over 60, under 16, certain benefits, or conditions like diabetes, hypothyroidism, epilepsy)
- NHS Low Income Scheme (HC2 certificate)
- Free sight tests (over 60, certain benefits, diabetes/glaucoma)
- Free dental treatment (certain benefits)

PRACTICAL SUPPORT:
- Blue Badge (severe mobility problems, blind, certain other criteria)
- Motability scheme (enhanced rate PIP mobility or higher rate DLA mobility)
- Disabled person's bus pass / Freedom Pass
- NHS Continuing Healthcare (fully funded care package)
- Social services care package

TAX RELIEF:
- Married Couple's Allowance (either partner born before 6 April 1935)
- Marriage Allowance
- Income Tax reduction if blind

HOUSING:
- Housing Benefit (renting, low income)
- Supported housing
- Discretionary Housing Payment

PERSON'S RECORD:
{PERSON_DATA}

For each entitlement the person may be eligible for, provide a JSON object. Respond ONLY with a JSON array, ordered by estimated annual value (highest first).

Each object must have:
- benefit_name: exact name of the benefit
- benefit_category: one of 'disability_benefit', 'carer_benefit', 'financial_support', 'practical_support', 'health_exemption', 'housing', 'tax_relief'
- eligibility_status: 'likely_eligible', 'possibly_eligible', or 'already_claiming'
- confidence: 'high', 'medium', or 'low'
- estimated_annual_value: approximate yearly value (e.g. '£5,740', 'up to £30,000 one-off grant', 'varies by local authority')
- what_it_is: plain English description, 2 sentences max
- reasoning: why they likely qualify based on their record, 2 to 3 sentences. For Attendance Allowance and PIP, translate care needs into benefit language (e.g. "needs help with personal care" -> "requires physical assistance with upper and lower body dressing and washing due to limited mobility")
- how_to_apply: brief overview, 1 to 2 sentences
- key_criteria: array of specific criteria they meet
- missing_info: array of additional information that would help confirm eligibility (empty array if none)

Age rules:
- Under 16: DLA, not PIP
- 16 to 65: PIP, not Attendance Allowance
- Over 65: Attendance Allowance, not PIP (unless already on PIP before reaching state pension age)

Never use em dashes or en dashes. Use commas, full stops, or colons instead.
Return ONLY a valid JSON array. No other text.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();
  const { person_id, household_id } = body as { person_id: string; household_id: string };
  if (!person_id || !household_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const svc = await createServiceClient();

  const { data: membership } = await svc
    .from("household_members")
    .select("role")
    .eq("household_id", household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "owner" && membership.role !== "editor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: max once per hour per person
  const { data: lastEntitlement } = await svc
    .from("entitlements")
    .select("last_checked_at")
    .eq("person_id", person_id)
    .order("last_checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEntitlement?.last_checked_at) {
    const elapsed = Date.now() - new Date(lastEntitlement.last_checked_at).getTime();
    if (elapsed < 60 * 60 * 1000) {
      const minutesLeft = Math.ceil((60 * 60 * 1000 - elapsed) / 60000);
      return NextResponse.json(
        { error: `Please wait ${minutesLeft} more minute${minutesLeft === 1 ? "" : "s"} before checking again.` },
        { status: 429 }
      );
    }
  }

  const [{ data: person }, { data: conditions }, { data: medications }, { data: allergies }, { data: existingEntitlements }] =
    await Promise.all([
      svc.from("people").select("*").eq("id", person_id).single(),
      svc.from("conditions").select("name, date_diagnosed, is_active, notes").eq("person_id", person_id),
      svc.from("medications").select("name, dosage, frequency, purpose, is_active").eq("person_id", person_id).eq("is_active", true),
      svc.from("allergies").select("name, severity").eq("person_id", person_id),
      svc.from("entitlements").select("benefit_name, eligibility_status, current_status").eq("person_id", person_id),
    ]);

  if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const age = person.date_of_birth ? calculateAge(person.date_of_birth) : null;

  const personData = {
    age,
    date_of_birth: person.date_of_birth,
    conditions: conditions ?? [],
    medications: medications ?? [],
    allergies: allergies ?? [],
    care_needs_assessment: person.care_needs_assessment ?? {},
    gp_surgery: person.gp_surgery,
    notes: person.notes,
    already_claiming: (existingEntitlements ?? [])
      .filter((e) => e.eligibility_status === "already_claiming")
      .map((e) => e.benefit_name),
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let responseText: string;
  const aiStart = Date.now();
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: SYSTEM_PROMPT.replace("{PERSON_DATA}", JSON.stringify(personData, null, 2)),
      }],
    });
    void trackApiCall({ userId: user.id, householdId: person_id, feature: "entitlements_check", action: "check_performed", status: "success", tokensUsed: (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0), durationMs: Date.now() - aiStart });
    const block = message.content[0];
    responseText = block.type === "text" ? block.text : "[]";
  } catch (err) {
    console.error("[entitlements/check] Anthropic error:", err);
    void trackApiCall({ userId: user.id, feature: "entitlements_check", action: "check_failed", status: "error", errorMessage: String(err), durationMs: Date.now() - aiStart });
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }

  let found: Array<{
    benefit_name: string;
    benefit_category: string;
    eligibility_status: string;
    confidence: string;
    estimated_annual_value?: string;
    what_it_is: string;
    reasoning: string;
    how_to_apply?: string;
    key_criteria?: string[];
    missing_info?: string[];
  }>;

  try {
    const json = responseText.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
    found = JSON.parse(json);
    if (!Array.isArray(found)) found = [];
  } catch {
    console.error("[entitlements/check] Failed to parse AI response:", responseText.slice(0, 300));
    found = [];
  }

  // Upsert: for each returned benefit, update if exists by name, otherwise insert
  const existingNames = new Map(
    (existingEntitlements ?? []).map((e) => [e.benefit_name.toLowerCase(), e])
  );

  const now = new Date().toISOString();

  for (const item of found) {
    const key = item.benefit_name.toLowerCase();
    const existing = existingNames.get(key);

    const payload = {
      person_id,
      household_id,
      benefit_name: item.benefit_name,
      benefit_category: item.benefit_category as EntitlementCategory,
      eligibility_status: item.eligibility_status as EntitlementEligibilityStatus,
      confidence: item.confidence as EntitlementConfidence,
      estimated_annual_value: item.estimated_annual_value ?? null,
      what_it_is: item.what_it_is,
      reasoning: item.reasoning,
      how_to_apply: item.how_to_apply ?? null,
      key_criteria: item.key_criteria ?? [],
      missing_info: item.missing_info ?? [],
      last_checked_at: now,
      updated_at: now,
    };

    if (existing) {
      await svc.from("entitlements")
        .update({
          eligibility_status: payload.eligibility_status,
          confidence: payload.confidence,
          estimated_annual_value: payload.estimated_annual_value,
          what_it_is: payload.what_it_is,
          reasoning: payload.reasoning,
          how_to_apply: payload.how_to_apply,
          key_criteria: payload.key_criteria,
          missing_info: payload.missing_info,
          last_checked_at: now,
          updated_at: now,
        })
        .eq("person_id", person_id)
        .eq("benefit_name", item.benefit_name);
    } else {
      await svc.from("entitlements").insert({
        ...payload,
        current_status: "not_started" as EntitlementCurrentStatus,
        is_dismissed: false,
      });
    }
  }

  const { data: all } = await svc
    .from("entitlements")
    .select("*")
    .eq("person_id", person_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ entitlements: all ?? [], checked_at: now });
}
