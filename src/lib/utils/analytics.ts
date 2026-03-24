// Client-side analytics helpers — fire and forget, never block the UI

function post(body: Record<string, unknown>) {
  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function trackPageView(path: string, referrerPath?: string) {
  post({ type: "page_view", path, referrer_path: referrerPath ?? null });
}

export function trackFeatureUsage(
  feature: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  post({
    type: "feature_usage",
    feature,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
  });
}

export function trackError(
  errorType: string,
  errorMessage: string,
  stackTrace?: string,
  path?: string,
  metadata?: Record<string, unknown>
) {
  post({
    type: "error",
    error_type: errorType,
    error_message: errorMessage,
    stack_trace: stackTrace ?? null,
    path: path ?? null,
    metadata: metadata ?? {},
  });
}
