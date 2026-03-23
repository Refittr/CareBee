import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a health document scanner for CareBee, a UK family care record app. Examine the image and extract all structured health and care data from it.

The image may be any of the following: an NHS letter, discharge summary, prescription, appointment letter, benefit letter, blood test results, a photo of a medical device screen (blood pressure monitor, pulse oximeter, glucose meter, peak flow meter, thermometer, scales), a handwritten note, a screenshot, or any other health or care related document.

Never use em dashes or en dashes in any extracted text. Use commas, full stops, colons, or rewrite instead.
Do not classify test results as conditions. A blood pressure reading is a test result, not a condition.
Format all dates as YYYY-MM-DD.

Return ONLY a JSON object. No other text. Use this exact structure:

{
  "document_type": "clinical_letter" | "prescription" | "test_result" | "imaging_report" | "benefit_letter" | "care_document" | "legal_document" | "appointment_letter" | "discharge_summary" | "referral_letter" | "other" | "unrecognised",
  "document_subtype": "specific subtype e.g. blood_pressure, spo2, blood_glucose, peak_flow, blood_test, discharge_summary, pip_letter, or null",
  "document_date": "YYYY-MM-DD or null",
  "summary": "One plain English sentence describing what this document is",
  "confidence": "high" | "medium" | "low",
  "source": "Issuing organisation if visible, or null",
  "author": "Name of person who wrote or signed it if visible, or null",
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
      "test_name": "Name of the test or measurement, e.g. Blood Pressure, SpO2, HbA1c, eGFR, Peak Flow, Blood Glucose, Heart Rate, Weight, Temperature",
      "result_value": "The value with its units, e.g. 132/84 mmHg, 97%, 48 mmol/mol, 420 L/min, 7.2 mmol/L",
      "result_date": "YYYY-MM-DD or null",
      "normal_range": "Normal range if shown, or null",
      "is_abnormal": true | false | null,
      "flag": "normal" | "high" | "low" | "critical" | null,
      "ordered_by": "string or null",
      "notes": "Plain English note e.g. slightly above normal range, or null",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "benefit": {
    "benefit_type": "e.g. Attendance Allowance, PIP, Carer's Allowance, Blue Badge",
    "decision": "awarded" | "rejected" | "under review" | "renewal due" | null,
    "rate": "e.g. higher rate, standard rate, enhanced, or null",
    "weekly_amount": "Weekly amount as a string, or null",
    "start_date": "YYYY-MM-DD or null",
    "review_date": "YYYY-MM-DD or null",
    "reference_number": "string or null",
    "confidence": "high" | "medium" | "low"
  },
  "imaging_report": {
    "scan_type": "X-ray, CT, MRI, ultrasound, DEXA, or mammogram",
    "body_area": "e.g. chest, left knee, abdomen, or null",
    "findings": "Plain English summary of findings, or null",
    "conclusion": "Radiologist conclusion if stated, or null",
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

Rules:
- document_type, document_date, summary, and confidence must always be present.
- Omit any other top-level key whose array is empty or whose object has no data.
- A photo of a blood pressure monitor showing numbers is a test_result with test_name "Blood Pressure". Extract the reading into result_value.
- A photo of a pulse oximeter is a test_result with test_name "SpO2". A glucose meter is a test_result with test_name "Blood Glucose". A peak flow meter is test_name "Peak Flow".
- Handwritten notes, device screens, screenshots, and informal formats are all valid. Always try to extract data.
- Only return document_type "unrecognised" if the image contains absolutely no health, care, medication, appointment, benefit, or legal information at all.
- Do not invent data. If a field is not clearly visible, set it to null.`;

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
    // Log the AI scan via RPC (bypasses RLS via SECURITY DEFINER function)
    const { error: logError } = await svc.rpc("log_user_activity", {
      p_action: "ai_scan_performed",
      p_entity_type: "document",
      p_entity_id: null,
      p_metadata: { person_id, household_id, document_type: result.document_type ?? "unknown" },
    });
    if (logError) {
      console.error("[scan-document] activity log failed:", logError.message);
    }
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
