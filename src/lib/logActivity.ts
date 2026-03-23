import { createClient } from "@/lib/supabase/client";

export async function logActivity(
  action: string,
  entity_type?: string,
  entity_id?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("admin_activity_log").insert({
      user_id: user.id,
      action,
      entity_type: entity_type ?? null,
      entity_id: entity_id ?? null,
      metadata: metadata ?? {},
    });

    if (error) {
      console.error("[logActivity]", error.message);
    }
  } catch (err) {
    console.error("[logActivity]", err);
  }
}
