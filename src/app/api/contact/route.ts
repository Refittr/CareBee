import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendContactEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, message } = body as { name?: string; email?: string; message?: string };

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const svc = await createServiceClient();

  const { error: dbError } = await svc.from("contact_messages").insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
  });

  if (dbError) {
    console.error("[contact] Failed to save message:", dbError);
    return NextResponse.json({ error: "Could not save your message. Please try again." }, { status: 500 });
  }

  try {
    await sendContactEmail({ name: name.trim(), email: email.trim(), message: message.trim() });
  } catch (err) {
    // Message is saved — email failure is non-fatal
    console.error("[contact] Email send failed:", err);
  }

  return NextResponse.json({ ok: true });
}
