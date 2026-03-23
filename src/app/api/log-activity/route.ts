import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { action, entity_type, entity_id, metadata } = body as {
    action: string;
    entity_type?: string;
    entity_id?: string;
    metadata?: Record<string, unknown>;
  };

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const svc = await createServiceClient();
  const { error } = await svc.from("admin_activity_log").insert({
    user_id: user.id,
    action,
    entity_type: entity_type ?? null,
    entity_id: entity_id ?? null,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("[log-activity] insert failed:", error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
