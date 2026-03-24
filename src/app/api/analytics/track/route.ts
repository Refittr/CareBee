import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Allow unauthenticated error reports; user_id will be null
  const userId = user?.id ?? null;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const svc = await createServiceClient();
  const type = body.type as string;

  try {
    if (type === "page_view") {
      await svc.from("page_view_log").insert({
        user_id: userId,
        path: body.path as string,
        referrer_path: (body.referrer_path as string | null) ?? null,
        session_id: (body.session_id as string | null) ?? null,
      });
    } else if (type === "feature_usage") {
      await svc.from("feature_usage_log").insert({
        user_id: userId,
        feature: body.feature as string,
        action: body.action as string,
        entity_type: (body.entity_type as string | null) ?? null,
        entity_id: (body.entity_id as string | null) ?? null,
        metadata: (body.metadata as Record<string, unknown>) ?? {},
      });
    } else if (type === "error") {
      await svc.from("error_log").insert({
        user_id: userId,
        error_type: body.error_type as string,
        error_message: body.error_message as string,
        stack_trace: (body.stack_trace as string | null) ?? null,
        path: (body.path as string | null) ?? null,
        metadata: (body.metadata as Record<string, unknown>) ?? {},
      });
    }
  } catch (err) {
    console.error("[analytics/track] insert failed:", err);
  }

  return NextResponse.json({ ok: true });
}
