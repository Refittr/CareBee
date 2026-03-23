import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { calculateAge } from "@/lib/utils/dates";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { appointment_id, person_id, household_id } = await request.json() as {
    appointment_id: string; person_id: string; household_id: string;
  };
  if (!appointment_id || !person_id || !household_id)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const svc = await createServiceClient();

  const { data: membership } = await svc.from("household_members").select("role")
    .eq("household_id", household_id).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    { data: appt },
    { data: person },
    { data: conditions },
    { data: medications },
    { data: allergies },
    { data: insights },
    { data: interactions },
  ] = await Promise.all([
    svc.from("appointments").select("*").eq("id", appointment_id).single(),
    svc.from("people").select("*").eq("id", person_id).single(),
    svc.from("conditions").select("*").eq("person_id", person_id).eq("is_active", true),
    svc.from("medications").select("*").eq("person_id", person_id).eq("is_active", true),
    svc.from("allergies").select("*").eq("person_id", person_id),
    svc.from("health_insights").select("*").eq("person_id", person_id).eq("status", "active").order("created_at", { ascending: false }).limit(10),
    svc.from("drug_interactions").select("*").eq("person_id", person_id).eq("status", "active"),
  ]);

  if (!appt || !person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find previous appointment with the same department
  let previousAppt = null;
  if (appt.department || appt.professional_name) {
    const { data: prev } = await svc.from("appointments")
      .select("*")
      .eq("person_id", person_id)
      .neq("id", appointment_id)
      .eq("status", "completed")
      .order("appointment_date", { ascending: false })
      .limit(5);

    if (prev) {
      previousAppt = prev.find(
        (p) =>
          (appt.department && p.department?.toLowerCase() === appt.department.toLowerCase()) ||
          (appt.professional_name && p.professional_name?.toLowerCase() === appt.professional_name?.toLowerCase())
      ) ?? prev[0] ?? null;
    }
  }

  const age = person.date_of_birth ? calculateAge(person.date_of_birth) : null;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const systemPrompt = `You are generating an appointment preparation brief for CareBee, a UK family health and care record app. The family is about to attend a medical appointment and needs a clear, practical summary of what to discuss.

Generate a preparation brief with these sections:

1. APPOINTMENT SUMMARY
- Who the appointment is with, date and time, location

2. WHAT HAS CHANGED SINCE LAST VISIT
- List changes in the person's record since the last appointment with this department, or the last 3 months if no previous appointment. Include new conditions, medication changes, new test results.

3. QUESTIONS TO ASK
- Numbered list of specific questions the family should ask. Make them specific to this person. "Should Mum's HbA1c be checked given it was 58 mmol/mol six months ago?" is better than "Ask about blood tests."
- Include any relevant active health insights or drug interactions.

4. THINGS TO MENTION
- Anything the family should proactively tell the clinician: new symptoms, problems with medications, changes in care needs, carer concerns.

5. DOCUMENTS TO BRING
- List useful documents to bring. Note: "Your CareBee emergency summary has all key information if needed."

6. FOLLOW-UP REMINDERS
- After the appointment: complete the appointment debrief in CareBee, update medication changes, log new referrals, note next appointment date.

RULES:
- Keep it to approximately 400 to 600 words, one page when printed.
- Use plain English. Be specific to this person and this appointment.
- Use the person's first name throughout.
- Never use em dashes or en dashes. Use commas, full stops, or colons instead.
- Return only the brief text with clear section headings. No JSON, no markdown code blocks.`;

  const userMessage = [
    `TODAY: ${today}`,
    `\nAPPOINTMENT:\n${JSON.stringify(appt, null, 2)}`,
    `\nPERSON:\nName: ${person.first_name} ${person.last_name}, Age: ${age ?? "unknown"}`,
    `\nCONDITIONS:\n${JSON.stringify(conditions ?? [], null, 2)}`,
    `\nMEDICATIONS:\n${JSON.stringify(medications ?? [], null, 2)}`,
    `\nALLERGIES:\n${JSON.stringify(allergies ?? [], null, 2)}`,
    previousAppt ? `\nPREVIOUS APPOINTMENT WITH THIS DEPARTMENT:\n${JSON.stringify(previousAppt, null, 2)}` : "",
    (insights ?? []).length > 0 ? `\nACTIVE HEALTH INSIGHTS:\n${JSON.stringify(insights, null, 2)}` : "",
    (interactions ?? []).length > 0 ? `\nACTIVE DRUG INTERACTIONS:\n${JSON.stringify(interactions, null, 2)}` : "",
  ].filter(Boolean).join("\n");

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let content: string;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = msg.content[0];
    content = block.type === "text" ? block.text.trim() : "";
    if (!content) return NextResponse.json({ error: "No content generated." }, { status: 422 });
  } catch (err) {
    console.error("[appointments/prep] Anthropic error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }

  // Delete any existing prep for this appointment and insert fresh
  await svc.from("appointment_preps").delete().eq("appointment_id", appointment_id);
  const { data: prep } = await svc.from("appointment_preps").insert({
    appointment_id,
    person_id,
    household_id,
    content,
  }).select().single();

  return NextResponse.json({ prep });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appointment_id = searchParams.get("appointment_id");
  if (!appointment_id) return NextResponse.json({ error: "Missing appointment_id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const svc = await createServiceClient();
  const { data: prep } = await svc.from("appointment_preps")
    .select("*").eq("appointment_id", appointment_id).maybeSingle();

  return NextResponse.json({ prep: prep ?? null });
}
