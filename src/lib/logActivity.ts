export async function logActivity(
  action: string,
  entity_type?: string,
  entity_id?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // keepalive ensures the request completes even if the page navigates away
    await fetch("/api/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entity_type, entity_id, metadata }),
      keepalive: true,
    });
  } catch {
    // Non-critical, never throw
  }
}
