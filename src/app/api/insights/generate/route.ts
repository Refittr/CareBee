import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { trackApiCall } from "@/lib/analytics-server";
import { hasPremiumAccess } from "@/lib/permissions";
import type { HealthInsight, InsightPriority, InsightStatus, InsightType, InsightCategory } from "@/lib/types/database";

const SYSTEM_PROMPT = `You are a health insights engine for CareBee, a UK family health and care record app. You are given a person's complete health record and your job is to identify useful insights, missing checks, trends, and care gaps.

You are NOT giving medical advice. You are surfacing information that the family should discuss with their GP or relevant healthcare professional. Frame everything as a suggestion to raise with their clinician, never as a directive.

PERSON'S RECORD:
{PERSON_DATA}

{ALREADY_HANDLED}

When analysing the record, pay attention to the CARE NOTES section in the person data. These notes capture important context about how the person communicates, behaves, what has been tried before, professional contacts, and benefits advice. Pinned notes are particularly important. Factor any relevant notes into your insights.

Based on this record, generate insights in the following categories:

1. NICE GUIDELINE CHECKS ("missing_check")
Look at each active condition and check whether the routine monitoring recommended by NICE guidelines appears to be happening based on the test results and appointment history. Common examples:
- Type 2 diabetes: HbA1c every 3 to 6 months, annual foot check, annual eye screening, annual kidney function (eGFR and ACR), blood pressure check, cholesterol check
- Hypertension: blood pressure monitoring, annual blood tests (kidney function, electrolytes), medication review
- CKD: eGFR monitoring frequency depends on stage, urine ACR, blood pressure
- Atrial fibrillation: INR monitoring if on warfarin, annual review
- Asthma: annual asthma review, peak flow monitoring, inhaler technique check
- COPD: annual review, spirometry, flu and pneumonia vaccinations
- Heart failure: regular weight monitoring, blood tests (kidney function, BNP), medication review
- Hypothyroidism: TFTs every 12 months once stable
- Depression or anxiety: medication review at appropriate intervals
- Dementia: annual review, carer support assessment
- Osteoporosis: DEXA scan interval, calcium and vitamin D
- Any other condition: apply the relevant NICE guideline monitoring schedule

If a check appears overdue based on the last recorded test date and the recommended interval, flag it.

2. TEST RESULT TRENDS ("test_trend")
Look at test results over time. Flag:
- Values moving in a concerning direction even if still in range (e.g. HbA1c rising over consecutive tests)
- Values that have moved out of normal range
- Significant changes between consecutive readings
Always include the actual values and dates so the family can see the trend.

3. MEDICATION REVIEWS ("medication_review")
Flag:
- Medications that have been on the list for over 12 months without a recorded review
- Multiple medications for the same condition that might indicate a review is needed
- Medications that commonly require monitoring blood tests (e.g. methotrexate needs regular FBC and LFTs, lithium needs levels checked, statins need LFTs)
- Any medication where the monitoring blood test appears overdue

4. CARE GAPS ("care_gap")
Flag:
- Conditions without a clear care plan or named clinician
- Referrals that were mentioned in letters but do not appear in the waiting list
- Follow-up appointments that were recommended but not scheduled

5. GENERAL OBSERVATIONS ("general")
Flag anything else useful:
- Flu or COVID vaccination reminders based on age or conditions
- Screening programmes they may be eligible for based on age (bowel cancer screening, breast screening, AAA screening, cervical screening)
- Carer assessment reminder if there is evidence of significant caring responsibilities
- Annual health check for people with learning disabilities

DEDUPLICATION RULES - follow these exactly:
- Before finalising your list, group all insights by the real-world issue they are about. Two insights are about the same issue if they would both be resolved by the same action.
- Examples of the same issue that must be merged: (a) "glaucoma not in conditions list" and "ophthalmology appointments suggest glaucoma" are the same issue; (b) "dihydrocodeine has no end date" and "dihydrocodeine ongoing use after condition ended" and "dihydrocodeine not linked to condition" are the same issue; (c) "duplicate appointments" and "duplicate appointment entries need tidying" are the same issue.
- Merge all insights about the same real-world issue into ONE insight that covers all angles.
- If two insights about the same medication exist, merge them into one.
- If two insights about the same condition exist, merge them into one.
- If two insights about the same screening programme exist, merge them into one.
- After merging, your final list must contain zero overlapping insights. Each insight must be about a distinct issue.
- Maximum 12 insights. If you have more than 12 after merging, keep only the most actionable ones.

Assign each insight a topic_key: a short snake_case identifier of the underlying issue (e.g. "glaucoma_condition", "dihydrocodeine_review", "cervical_screening", "duplicate_appointments"). This is used to prevent the same issue appearing twice.

Respond with a JSON array of insights:

[
  {
    "topic_key": "hba1c_overdue",
    "insight_type": "nice_guideline",
    "category": "missing_check",
    "title": "HbA1c blood test may be overdue",
    "description": "Based on the Type 2 diabetes diagnosis, NICE guidelines recommend an HbA1c test every 3 to 6 months. The last recorded HbA1c was on 14 September 2025 (result: 58 mmol/mol). This is now over 6 months ago. It may be worth booking a blood test with the GP.",
    "priority": "important",
    "source_data": {
      "condition": "Type 2 diabetes",
      "guideline": "NICE NG28",
      "last_test_date": "2025-09-14",
      "last_test_value": "58 mmol/mol",
      "recommended_interval": "3 to 6 months"
    }
  }
]

RULES:
- Only flag things where there is genuine evidence from the record. Do not speculate.
- If there are no test results at all, generate one general insight suggesting they start building up a test result history, rather than flagging every possible missing test.
- Use plain English throughout. Explain any medical terms.
- Keep titles short and clear (under 15 words).
- Keep descriptions practical and actionable.
- Set priority to "urgent" only for genuinely time-sensitive things. Most insights should be "important" or "info".
- Never use em dashes or en dashes. Use commas, full stops, or colons instead.
- Return ONLY a valid JSON array. No other text.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await request.json();
  const { person_id, household_id, manual = false } = body as {
    person_id: string;
    household_id: string;
    manual?: boolean;
  };

  if (!person_id || !household_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const svc = await createServiceClient();

  // Verify membership
  const { data: membership } = await svc
    .from("household_members")
    .select("role")
    .eq("household_id", household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check premium access
  const { data: profile } = await svc
    .from("profiles")
    .select("account_type, plan, trial_ends_at, is_subscribed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !hasPremiumAccess(profile)) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  // Rate limiting: last check within 24h (auto) or 1h (manual)
  const { data: lastCheck } = await svc
    .from("insight_checks")
    .select("checked_at")
    .eq("person_id", person_id)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCheck) {
    const minGap = manual ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(lastCheck.checked_at).getTime();
    if (elapsed < minGap) {
      // Return existing active insights without regenerating
      const { data: existing } = await svc
        .from("health_insights")
        .select("*")
        .eq("person_id", person_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return NextResponse.json({ insights: existing ?? [], generated: false, lastChecked: lastCheck.checked_at });
    }
  }

  // Load full person record
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    { data: person },
    { data: conditions },
    { data: medications },
    { data: allergies },
    { data: testResults },
    { data: appointments },
    { data: handledInsights },
    { data: careNotes },
  ] = await Promise.all([
    svc.from("people").select("*").eq("id", person_id).single(),
    svc.from("conditions").select("*").eq("person_id", person_id).eq("is_active", true),
    svc.from("medications").select("*").eq("person_id", person_id).eq("is_active", true),
    svc.from("allergies").select("*").eq("person_id", person_id),
    svc.from("test_results").select("*").eq("person_id", person_id)
      .gte("result_date", twelveMonthsAgo.toISOString().split("T")[0])
      .order("result_date", { ascending: false }),
    svc.from("appointments").select("*").eq("person_id", person_id)
      .or(`appointment_date.gte.${sixMonthsAgo.toISOString().split("T")[0]},status.eq.upcoming`)
      .order("appointment_date", { ascending: false }),
    // Load dismissed and resolved insights so we don't regenerate them
    svc.from("health_insights")
      .select("title, status")
      .eq("person_id", person_id)
      .in("status", ["dismissed", "resolved"]),
    svc.from("care_notes").select("title, content, category, is_pinned").eq("person_id", person_id).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }),
  ]);

  if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const personData = {
    name: `${person.first_name} ${person.last_name}`,
    date_of_birth: person.date_of_birth,
    conditions: conditions ?? [],
    medications: medications ?? [],
    allergies: allergies ?? [],
    test_results: testResults ?? [],
    appointments: appointments ?? [],
    gp_surgery: person.gp_surgery,
    gp_name: person.gp_name,
    notes: person.notes,
    care_notes: (careNotes ?? []).map(n => ({ title: n.title, content: n.content, category: n.category, pinned: n.is_pinned })),
  };

  // Build already-handled context for the AI
  const handledTitles = (handledInsights ?? []).map((i) => `- ${i.title} (${i.status})`);
  const alreadyHandledSection = handledTitles.length > 0
    ? `INSIGHTS ALREADY HANDLED BY THE FAMILY (do not regenerate these):\n${handledTitles.join("\n")}`
    : "";

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let responseText: string;
  const aiStart = Date.now();
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: SYSTEM_PROMPT
          .replace("{PERSON_DATA}", JSON.stringify(personData, null, 2))
          .replace("{ALREADY_HANDLED}", alreadyHandledSection),
      }],
    });
    void trackApiCall({ userId: user.id, feature: "health_insights", action: "insights_generated", status: "success", tokensUsed: (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0), durationMs: Date.now() - aiStart });
    const block = message.content[0];
    responseText = block.type === "text" ? block.text : "[]";
  } catch (err) {
    console.error("[insights/generate] Anthropic error:", err);
    void trackApiCall({ userId: user.id, feature: "health_insights", action: "insights_failed", status: "error", errorMessage: String(err), durationMs: Date.now() - aiStart });
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }

  let newInsightData: Array<{
    topic_key?: string;
    insight_type: string;
    category: string;
    title: string;
    description: string;
    priority: string;
    source_data: Record<string, unknown>;
  }>;

  try {
    const json = responseText.trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
    newInsightData = JSON.parse(json);
    if (!Array.isArray(newInsightData)) newInsightData = [];
  } catch {
    console.error("[insights/generate] Failed to parse AI response:", responseText.slice(0, 300));
    newInsightData = [];
  }

  // Deduplicate within the returned set by topic_key
  const seenTopicKeys = new Set<string>();
  newInsightData = newInsightData.filter((i) => {
    const key = i.topic_key?.trim().toLowerCase();
    if (!key) return true;
    if (seenTopicKeys.has(key)) return false;
    seenTopicKeys.add(key);
    return true;
  });

  // Replace strategy: delete all existing ACTIVE insights and insert the fresh set.
  // Dismissed and resolved insights are preserved (user explicitly actioned them).
  await svc.from("health_insights")
    .delete()
    .eq("person_id", person_id)
    .eq("status", "active");

  const toInsert = newInsightData.map((i) => ({
    person_id,
    household_id,
    insight_type: i.insight_type as InsightType,
    category: i.category as InsightCategory,
    title: i.title,
    description: i.description,
    priority: (i.priority ?? "info") as InsightPriority,
    status: "active" as InsightStatus,
    source_data: { ...i.source_data, topic_key: i.topic_key ?? null },
    last_checked_at: new Date().toISOString(),
  }));

  if (toInsert.length > 0) {
    await svc.from("health_insights").insert(toInsert);
  }

  // Log to activity feed
  void svc.from("admin_activity_log").insert({
    user_id: user.id,
    action: "ai_feature_used",
    entity_type: "health_insights",
    entity_id: null,
    metadata: { person_id, household_id, insights_found: toInsert.length },
  });

  // Log the check
  await svc.from("insight_checks").insert({
    person_id,
    checked_at: new Date().toISOString(),
    insights_found: toInsert.length,
    new_insights: toInsert.length,
  });

  // Return current active insights
  const { data: allActive } = await svc
    .from("health_insights")
    .select("*")
    .eq("person_id", person_id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    insights: allActive ?? [],
    generated: true,
    newCount: toInsert.length,
    lastChecked: new Date().toISOString(),
  });
}
