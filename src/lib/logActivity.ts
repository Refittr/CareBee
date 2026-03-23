export async function logActivity(
  action: string,
  entity_type?: string,
  entity_id?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entity_type, entity_id, metadata }),
    });
  } catch {
    // Non-critical, never throw
  }
}
