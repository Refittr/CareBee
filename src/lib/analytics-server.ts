import { createServiceClient } from "@/lib/supabase/server";

export async function trackApiCall({
  userId,
  householdId,
  feature,
  action,
  status,
  errorMessage,
  tokensUsed,
  durationMs,
  metadata,
}: {
  userId: string | null;
  householdId?: string | null;
  feature: string;
  action: string;
  status: "success" | "error" | "timeout";
  errorMessage?: string | null;
  tokensUsed?: number | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const svc = await createServiceClient();
    await svc.from("api_usage_log").insert({
      user_id: userId,
      household_id: householdId ?? null,
      feature,
      action,
      status,
      error_message: errorMessage ?? null,
      tokens_used: tokensUsed ?? null,
      duration_ms: durationMs ?? null,
      metadata: metadata ?? {},
    });
  } catch (err) {
    console.error("[trackApiCall] failed to log:", err);
  }
}
