import { createClient } from "@/lib/supabase/client";

/**
 * Logs a user action to the admin activity log.
 * Uses a SECURITY DEFINER Postgres function so the anon client
 * can insert into the activity log table despite RLS.
 */
export async function logActivity(
  action: string,
  entity_type?: string,
  entity_id?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("log_user_activity", {
      p_action: action,
      p_entity_type: entity_type ?? null,
      p_entity_id: entity_id ?? null,
      p_metadata: metadata ?? {},
    });
    if (error) {
      console.error("[logActivity] rpc error:", error.message);
    }
  } catch (err) {
    console.error("[logActivity] error:", err);
  }
}
