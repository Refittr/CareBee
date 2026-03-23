import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a document scanner for CareBee, a UK family health and care record app. Your job is to examine a photographed or uploaded document and extract all useful structured data from it.

You must identify what type of document this is and extract the relevant data. Documents can be any of the following categories:

CLINICAL: discharge summaries, clinic letters, GP letters, referral letters, A&E summaries
PRESCRIPTIONS: repeat prescriptions, medication lists, pharmacy labels, medication review letters
TEST RESULTS: blood tests (FBC, HbA1c, LFT, U&E, TFT, lipids, glucose, INR, PSA, vitamin D, iron studies, any other panel), blood oxygen/SpO2/sats readings, blood pressure readings, blood glucose readings, peak flow, spirometry, ECG reports, urine tests, stool tests, pregnancy tests, COVID tests, weight/BMI, temperature, heart rate, sleep studies, hearing tests, vision tests, allergy tests, genetic tests
IMAGING: X-ray reports, CT reports, MRI reports, ultrasound reports, DEXA scans, mammograms
BENEFITS: Attendance Allowance, PIP, Carer's Allowance, council tax reduction, Blue Badge, NHS exemptions, Pension Credit, DWP assessments
CARE: care needs assessments, care plans, OT reports, physiotherapy reports, speech therapy reports, dietitian letters, mental health care plans, CAMHS documents
SEND: EHCPs, annual reviews, developmental assessments, paediatrician letters, school nurse reports, health visitor reports, immunisation records
LEGAL: Power of Attorney, DNACPR, advance decisions, Court of Protection orders, deputyship orders
APPOINTMENTS: appointment letters, waiting list letters, cancellations, NHS 111 summaries, ambulance reports

Never use em dashes or en dashes in any extracted text. Use commas, full stops, colons, or rewrite instead.

Return a JSON object with this structure:

{
  "document_type": "clinical_letter" | "prescription" | "test_result" | "imaging_report" | "benefit_letter" | "care_document" | "send_document" | "legal_document" | "appointment_letter" | "discharge_summary" | "referral_letter" | "other" | "unrecognised",
  "document_subtype": "more specific type, e.g. discharge_summary, blood_test, spo2_reading, attendance_allowance, ehcp, or null",
  "summary": "A plain English one-sentence summary of what this document is",
  "confidence": "high" | "medium" | "low",
  "document_date": "YYYY-MM-DD or null",
  "source": "Who issued it (hospital name, GP surgery, DWP, local authority, etc.) if visible, or null",
  "author": "The named person who wrote or signed it if visible, or null",
  "medications": [
    {
      "name": "string",
      "dosage": "string or null",
      "frequency": "string or null",
      "purpose": "string or null",
      "prescribed_by": "string or null",
      "start_date": "YYYY-MM-DD or null",
      "action": "new" | "changed" | "stopped",
      "change_reason": "string or null",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "conditions": [
    {
      "name": "string",
      "date_diagnosed": "YYYY-MM-DD or null",
      "diagnosed_by": "string or null",
      "diagnosed_at_location": "string or null",
      "status": "string or null",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "allergies": [
    {
      "name": "string",
      "reaction": "string or null",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "appointments": [
    {
      "title": "string",
      "date": "YYYY-MM-DD or null",
      "time": "HH:MM or null",
      "location": "string or null",
      "professional_name": "string or null",
      "department": "string or null",
      "trust_or_service": "string or null",
      "type": "upcoming" | "past",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "test_results": [
    {
      "test_name": "string (e.g. SpO2, HbA1c, Blood Pressure, Full Blood Count, eGFR, Peak Flow, Blood Glucose)",
      "result_value": "string with units (e.g. 97%, 48 mmol/mol, 142/88 mmHg, 6.2 mmol/L, 420 L/min)",
      "result_date": "YYYY-MM-DD or null",
      "normal_range": "string or null",
      "is_abnormal": true | false | null,
      "flag": "normal" | "high" | "low" | "critical" | null,
      "ordered_by": "string or null",
      "notes": "string or null (plain English interpretation)",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "benefit": {
    "benefit_type": "e.g. Attendance Allowance, PIP, Carer's Allowance",
    "decision": "awarded" | "rejected" | "under review" | "renewal due" | null,
    "rate": "higher rate, lower rate, standard rate, enhanced, etc. or null",
    "weekly_amount": "amount as string or null",
    "start_date": "YYYY-MM-DD or null",
    "review_date": "YYYY-MM-DD or null",
    "reference_number": "string or null",
    "confidence": "high" | "medium" | "low"
  },
  "imaging_report": {
    "scan_type": "X-ray, CT, MRI, ultrasound, DEXA, mammogram",
    "body_area": "e.g. chest, left knee, abdomen or null",
    "findings": "plain English summary of findings or null",
    "conclusion": "radiologist conclusion if stated or null",
    "confidence": "high" | "medium" | "low"
  },
  "referrals": [
    {
      "referred_to": "string",
      "referred_by": "string or null",
      "referral_date": "YYYY-MM-DD or null",
      "reason": "string or null",
      "expected_wait": "string or null",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "professional_contacts": [
    {
      "name": "string",
      "role": "string or null",
      "department": "string or null",
      "location": "string or null"
    }
  ],
  "follow_up_actions": [
    {
      "description": "string",
      "date": "YYYY-MM-DD or null"
    }
  ]
}

IMPORTANT RULES:
- Always try to extract something useful. Most photographed documents contain health or care data even if they are not perfectly clear or in an unexpected format.
- If the document is a handwritten note, a photo of a device screen (like a pulse oximeter or blood pressure monitor), a screenshot from an app, or any informal format, still try to extract the data. Do not reject it because it is not a formal letter.
- If you genuinely cannot identify any health, care, benefits, legal, or appointment data in the image, return: {"document_type": "unrecognised", "document_subtype": null, "summary": "description of what you can see", "confidence": "low", "document_date": null, "source": null, "author": null}
- Never say "no health data found" if there is ANY health-related information visible, even a single reading.
- A photo of a pulse oximeter screen showing 97% is health data. A photo of a blood pressure monitor showing 132/84 is health data. A photo of a blood glucose meter showing 7.2 is health data. A handwritten note saying "Dr said reduce ramipril to 2.5mg" is health data.
- Use plain English in all summaries and descriptions.
- For test results, always include the reference range and flag (high/low/normal) if shown on the document.
- Do not classify test results as conditions. Blood pressure 142/88 is a test result, not a condition.
- Do not invent data that is not visible. If a field is not visible, set it to null.
- Only include top-level keys that have data. Omit empty arrays and null objects (except document_type, summary, confidence, and document_date which must always be present).`;

const USER_PROMPT =
  "Extract all structured health and care data from this document. Return only valid JSON matching the schema described in your instructions. Do not include any text outside the JSON object.";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { file_path, person_id, household_id } = body as {
    file_path: string;
    person_id: string;
    household_id: string;
  };

  if (!file_path || !person_id || !household_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const svc = await createServiceClient();

  // Verify caller is owner or editor
  const { data: membership } = await svc
    .from("household_members")
    .select("role")
    .eq("household_id", household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !membership ||
    (membership.role !== "owner" && membership.role !== "editor")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await svc.storage
    .from("documents")
    .download(file_path);

  if (downloadError || !fileData) {
    console.error("Storage download error:", downloadError);
    return NextResponse.json(
      { error: "Could not retrieve the uploaded file." },
      { status: 500 }
    );
  }

  // Check file size (10MB limit)
  if (fileData.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "This file is too large. Please use an image under 10MB." },
      { status: 413 }
    );
  }

  const mimeType = fileData.type || "image/jpeg";
  const buffer = Buffer.from(await fileData.arrayBuffer());
  const base64Data = buffer.toString("base64");

  // Determine if image or PDF
  const isPdf = mimeType === "application/pdf";
  const supportedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!isPdf && !supportedImageTypes.includes(mimeType)) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Please use a JPEG, PNG, or PDF file.",
      },
      { status: 415 }
    );
  }

  // Call Anthropic API
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return NextResponse.json(
      {
        error:
          "Something went wrong while reading your document. Please try again.",
      },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let responseText: string;
  try {
    if (isPdf) {
      const message = await (anthropic.beta.messages as unknown as {
        create: (params: unknown) => Promise<Anthropic.Message>;
      }).create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        betas: ["pdfs-2024-09-25"],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Data,
                },
              },
              { type: "text", text: USER_PROMPT },
            ],
          },
        ],
      });
      const block = message.content[0];
      responseText = block.type === "text" ? block.text : "";
    } else {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType as
                    | "image/jpeg"
                    | "image/png"
                    | "image/gif"
                    | "image/webp",
                  data: base64Data,
                },
              },
              { type: "text", text: USER_PROMPT },
            ],
          },
        ],
      });
      const block = message.content[0];
      responseText = block.type === "text" ? block.text : "";
    }
  } catch (err) {
    console.error("Anthropic API error:", err);
    return NextResponse.json(
      {
        error:
          "Something went wrong while reading your document. Please try again.",
      },
      { status: 500 }
    );
  }

  // Parse JSON from response
  let jsonText = responseText.trim();
  // Strip markdown code fences if present
  jsonText = jsonText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const result = JSON.parse(jsonText);
    // Log the AI scan
    await svc.from("admin_activity_log").insert({
      user_id: user.id,
      action: "ai_scan_performed",
      entity_type: "document",
      entity_id: null,
      metadata: { person_id, household_id, document_type: result.document_type ?? "unknown" },
    });
    return NextResponse.json(result);
  } catch {
    console.error(
      "Failed to parse Claude response as JSON:",
      responseText.slice(0, 500)
    );
    return NextResponse.json(
      {
        error:
          "We could not read this document. Try taking a clearer photo or uploading a different document.",
      },
      { status: 422 }
    );
  }
}
