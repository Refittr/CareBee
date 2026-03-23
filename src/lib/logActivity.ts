export async function logActivity(
  action: string,
  entity_type?: string,
  entity_id?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetch("/api/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entity_type, entity_id, metadata }),
      keepalive: true,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[logActivity] failed:", res.status, text);
    }
  } catch (err) {
    console.error("[logActivity] fetch error:", err);
  }
}
