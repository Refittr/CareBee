import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/utils/dates";
import { trackApiCall } from "@/lib/analytics-server";
import { checkAndIncrementAiUse } from "@/lib/ai-usage";

const SYSTEM_PROMPT = `You are a letter and document writer for CareBee, a UK family health and care record app. You write letters, applications, and supporting statements for UK families navigating health, care, and benefits systems.

You will be given:
1. A document type (what kind of text to generate)
2. The person's record data
3. Any additional context

Write a complete, ready-to-use piece of text. It should:
- Be written in clear, professional but accessible English
- Include today's date at the top
- Reference the person's name, NHS number (if available), and other relevant details
- Be factual and based only on the data provided. For benefit applications: if care_notes contain benefits_advice entries, use the specific wording advice from those notes.
- Include all standard sections this type of document requires
- Leave [PLACEHOLDER] markers for specific details that are not in the record

For benefit applications and supporting statements:
- Translate care descriptions into formal benefit assessment language using DWP descriptors
- Be detailed and specific about how the condition affects daily life
- Include frequency, duration, and severity of difficulties
- Mention risks (falls, forgetting medication, leaving cooker on, etc.)
- Describe bad days as well as typical days
- Use phrases like "requires physical assistance", "needs prompting and supervision", "experiences significant difficulty", "is unable to" where appropriate and truthful

For NHS complaint letters:
- Be firm but professional
- Reference specific dates, names, and incidents from the record
- State what happened, what should have happened, the impact, and what resolution is sought
- Reference the NHS complaints procedure

For letters pushing back on an employer's request for a doctor's note:
- Tone: professional, warm, and firm but not aggressive. The goal is to open a dialogue, not start a fight.
- Structure: [DATE placeholder], salutation, body paragraphs, sign-off.
- The letter is written by the employee (use their name from ADDITIONAL CONTEXT).
- Address it to the manager/employer named in ADDITIONAL CONTEXT.
- Explain how appointments have been managed (annual leave, TOIL, or unpaid) using the value from ADDITIONAL CONTEXT.
- If work output has been confirmed as satisfactory and no valid business reason was given: include one sentence referencing the relevant legislation. Use the Equality Act 2010 for England/Wales/Scotland, or the Disability Discrimination Act 1995 for Northern Ireland. Only include legislation if both conditions are met.
- If a reason was given by the employer, acknowledge it and address it calmly.
- Close by requesting a meeting or conversation to discuss further.
- UK English spelling throughout. No em dashes anywhere.

For letters disclosing a health condition to an employer and requesting reasonable adjustments:
- Tone: professional, warm, and open. The goal is to start a constructive conversation, not make demands.
- Structure: [DATE placeholder], salutation, body paragraphs, sign-off.
- The letter is written by the employee (use their name from ADDITIONAL CONTEXT).
- Address it to the manager/employer named in ADDITIONAL CONTEXT.
- Use the condition description exactly as provided. Do not add clinical detail or diagnoses the user has not supplied.
- List the requested adjustments or support from ADDITIONAL CONTEXT.
- Only mention the Equality Act 2010 if ADDITIONAL CONTEXT says to. If mentioned, keep it as context rather than a threat.
- Close by inviting a follow-up meeting or conversation.
- UK English spelling throughout. No em dashes anywhere.

End every piece of text with this note on its own line:
"Note: Please review this carefully before using. Check all dates, names, and details are correct. Fill in any [PLACEHOLDER] sections."

Never use em dashes or en dashes. Use commas, full stops, or colons instead.

Return ONLY the document text. Do not include JSON, markdown, code blocks, or any wrapper. Start directly with the content.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();
  const {
    person_id,
    household_id,
    template_id,
    custom_prompt,
    entitlement_context,
  } = body as {
    person_id: string;
    household_id: string;
    template_id?: string;
    custom_prompt?: string;
    entitlement_context?: string;
  };

  if (!person_id || !household_id || (!template_id && !custom_prompt)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const svc = await createServiceClient();

  const { data: membership } = await svc
    .from("household_members")
    .select("role")
    .eq("household_id", household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const aiCheck = await checkAndIncrementAiUse(user.id);
  if (!aiCheck.allowed) {
    return NextResponse.json(
      { error: "ai_limit_reached", used: aiCheck.used, limit: aiCheck.limit },
      { status: 429 }
    );
  }

  const [{ data: person }, { data: conditions }, { data: medications }, { data: allergies }, { data: appointments }, { data: careNotes }] =
    await Promise.all([
      svc.from("people").select("*").eq("id", person_id).single(),
      svc.from("conditions").select("*").eq("person_id", person_id).eq("is_active", true),
      svc.from("medications").select("*").eq("person_id", person_id).eq("is_active", true),
      svc.from("allergies").select("*").eq("person_id", person_id),
      svc.from("appointments").select("*").eq("person_id", person_id).order("appointment_date", { ascending: false }).limit(10),
      svc.from("care_notes").select("title, content, category, is_pinned").eq("person_id", person_id).order("is_pinned", { ascending: false }),
    ]);

  if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const age = person.date_of_birth ? calculateAge(person.date_of_birth) : null;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const personData = {
    name: `${person.first_name} ${person.last_name}`,
    age,
    date_of_birth: person.date_of_birth,
    nhs_number: person.nhs_number,
    gp_surgery: person.gp_surgery,
    gp_name: person.gp_name,
    conditions: conditions ?? [],
    medications: medications ?? [],
    allergies: allergies ?? [],
    appointments: appointments ?? [],
    care_needs_assessment: person.care_needs_assessment ?? {},
    next_of_kin_name: person.next_of_kin_name,
    next_of_kin_relationship: person.next_of_kin_relationship,
    dnacpr_status: person.dnacpr_status,
    notes: person.notes,
    today,
    care_notes: (careNotes ?? []).map(n => ({ title: n.title, content: n.content, category: n.category, pinned: n.is_pinned })),
  };

  const templateLabel = template_id ? TEMPLATE_LABELS[template_id] ?? template_id : "custom letter";

  const userMessage = [
    `DOCUMENT TYPE: ${templateLabel}`,
    "",
    `PERSON RECORD:`,
    JSON.stringify(personData, null, 2),
    entitlement_context ? `\nADDITIONAL CONTEXT:\n${entitlement_context}` : "",
    custom_prompt ? `\nUSER INSTRUCTIONS:\n${custom_prompt}` : "",
  ].filter(Boolean).join("\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const aiStart = Date.now();
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    void trackApiCall({ userId: user.id, feature: "document_generation", action: "letter_generated", status: "success", tokensUsed: (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0), durationMs: Date.now() - aiStart, metadata: { document_type: template_id } });
    const block = message.content[0];
    const content = block.type === "text" ? block.text.trim() : "";
    if (!content) return NextResponse.json({ error: "No content generated. Please try again." }, { status: 422 });
    return NextResponse.json({ title: templateLabel, content });
  } catch (err) {
    console.error("[documents/generate] Anthropic error:", err);
    void trackApiCall({ userId: user.id, feature: "document_generation", action: "letter_failed", status: "error", errorMessage: String(err), durationMs: Date.now() - aiStart });
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}

const TEMPLATE_LABELS: Record<string, string> = {
  attendance_allowance: "Attendance Allowance supporting statement",
  pip_statement: "PIP (Personal Independence Payment) supporting statement",
  carers_allowance: "Carer's Allowance application helper",
  blue_badge: "Blue Badge application supporting evidence",
  council_tax_reduction: "Council tax reduction request letter",
  disabled_facilities_grant: "Disabled Facilities Grant supporting letter",
  nhs_continuing_healthcare: "NHS Continuing Healthcare checklist preparation",
  benefit_appeal: "Benefit appeal letter",
  mandatory_reconsideration: "Mandatory reconsideration request",
  pals_complaint: "PALS complaint letter",
  nhs_complaint_formal: "Formal NHS complaint letter",
  gp_referral_request: "GP referral request letter",
  waiting_list_chase: "Waiting list chase letter",
  subject_access_request: "Subject Access Request (SAR) for medical records",
  gp_summary: "GP summary letter",
  medication_summary: "Medication summary for hospital admission",
  care_needs_assessment_request: "Request for a care needs assessment",
  carers_assessment_request: "Request for a carer's assessment",
  care_complaint: "Complaint to the local authority about care services",
  care_package_review: "Request for a review of a care package",
  ehc_needs_assessment: "Request for an EHC needs assessment",
  ehcp_annual_review: "EHCP annual review parental response",
  send_tribunal_appeal: "SEND tribunal appeal letter",
  opg_cover_letter: "Cover letter to the Office of the Public Guardian",
  employer_letter: "Letter to employer explaining caring responsibilities",
  employer_push_back_doctors_note: "Letter pushing back on employer's request for a doctor's note",
  employer_disclose_health_condition: "Letter disclosing a health condition to employer and requesting reasonable adjustments",
  custom: "Custom letter",
};
