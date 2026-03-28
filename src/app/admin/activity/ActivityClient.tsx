"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ActivityEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  user_signup: "signed up",
  household_created: "created a care record",
  person_added: "added a person",
  document_uploaded: "uploaded a document",
  ai_scan_performed: "performed an AI scan",
  ai_feature_used: "used an AI feature",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  health_insights: "Health insights",
  appointment_prep: "Appointment prep",
  entitlements_check: "Entitlements check",
  document: "Document scan",
};

const ACTION_FILTERS = [
  { value: "", label: "All actions" },
  { value: "user_signup", label: "Signups" },
  { value: "household_created", label: "Households created" },
  { value: "person_added", label: "People added" },
  { value: "document_uploaded", label: "Documents uploaded" },
  { value: "ai_scan_performed", label: "AI scans" },
  { value: "ai_feature_used", label: "AI features" },
];

export function ActivityClient({
  initialActivity,
  initialTotal,
}: {
  initialActivity: ActivityEntry[];
  initialTotal: number;
}) {
  const [activity, setActivity] = useState<ActivityEntry[]>(initialActivity);
  const [total, setTotal] = useState(initialTotal);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  const fetchActivity = useCallback(async (filter: string, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (filter) params.set("action", filter);
    const res = await fetch(`/api/admin/activity?${params}`);
    const data = await res.json();
    setActivity(data.activity ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  async function handleFilter(value: string) {
    setActionFilter(value);
    setPage(1);
    await fetchActivity(value, 1);
  }

  async function handlePage(p: number) {
    setPage(p);
    await fetchActivity(actionFilter, p);
  }

  function formatTimestamp(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              actionFilter === f.value
                ? "bg-honey-400 text-warmstone-white border-honey-400"
                : "bg-warmstone-white text-warmstone-600 border-warmstone-200 hover:bg-warmstone-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={`bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden ${loading ? "opacity-50" : ""}`}>
        {activity.length === 0 ? (
          <p className="px-4 py-8 text-center text-warmstone-400 text-sm">
            No activity logged yet.
          </p>
        ) : (
          <div className="divide-y divide-warmstone-50">
            {activity.map((log) => (
              <div key={log.id} className="px-4 py-3 hover:bg-warmstone-50 flex items-start gap-4">
                <div className="text-xs text-warmstone-400 shrink-0 w-36 pt-0.5">
                  {formatTimestamp(log.created_at)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-warmstone-900">
                    <span className="font-medium">{log.user_name ?? log.user_email ?? "Unknown user"}</span>
                    {" "}
                    <span className="text-warmstone-600">{ACTION_LABELS[log.action] ?? log.action}</span>
                  </p>
                  {log.entity_type && (
                    <p className="text-xs text-warmstone-400 mt-0.5">
                      {ENTITY_TYPE_LABELS[log.entity_type] ?? log.entity_type.replace(/_/g, " ")}
                      {log.entity_id && (
                        <span className="text-warmstone-300 ml-1">({log.entity_id.slice(0, 8)}...)</span>
                      )}
                    </p>
                  )}
                  {log.user_email && log.user_name && (
                    <p className="text-xs text-warmstone-400">{log.user_email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t border-warmstone-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-warmstone-500">{total} entries total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded-md hover:bg-warmstone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-warmstone-600" />
              </button>
              <span className="text-xs text-warmstone-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= totalPages}
                className="p-1 rounded-md hover:bg-warmstone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} className="text-warmstone-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
