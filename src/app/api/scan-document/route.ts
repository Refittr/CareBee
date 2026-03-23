import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a medical document reader for a UK family care record app called CareBee. You extract structured health and care data from photographs of NHS letters, discharge summaries, prescriptions, appointment letters, benefit letters, and similar documents.

Extract as much structured data as you can find. Be precise with medication names, dosages, and frequencies. Use plain English for condition descriptions. Format dates as YYYY-MM-DD.

Return a JSON object with the following structure. Only include categories where you found relevant data. If a field is unclear or you are not confident, set its confidence to "low". If you are reasonably confident, set it to "medium". If you are very confident, set it to "high".

Do not invent or assume data that is not in the document. Only extract what you can actually read.

Never use em dashes or en dashes in any extracted text. Use commas, full stops, colons, or rewrite instead.

Extract any test results, blood work, blood pressure readings, or clinical measurements you find. Include the result value with its units, the normal range if stated, and whether the result is outside the normal range. Do not classify test results as conditions. A blood pressure reading of 142/88 is a test result, not a condition.

{
  "document_type": "discharge_summary" | "prescription" | "appointment_letter" | "test_result" | "benefit_letter" | "referral_letter" | "other",
  "document_date": "YYYY-MM-DD or null",
  "summary": "A brief plain English summary of what this document is about, 1 to 2 sentences",
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
      "test_name": "string (e.g. HbA1c, Blood Pressure, Full Blood Count, eGFR, Cholesterol, TSH)",
      "result_value": "string (e.g. 48 mmol/mol, 142/88 mmHg, 6.2 mmol/L)",
      "result_date": "YYYY-MM-DD or null",
      "normal_range": "string or null (e.g. below 42 mmol/mol, 90/60 to 120/80 mmHg)",
      "is_abnormal": "boolean or null (true if the result is outside the normal range)",
      "ordered_by": "string or null",
      "notes": "string or null (plain English interpretation, e.g. slightly above normal range)",
      "confidence": "high" | "medium" | "low"
    }
  ],
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
}`;

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
