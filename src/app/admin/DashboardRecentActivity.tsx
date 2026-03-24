"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ActivityEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

const PER_PAGE = 10;
const MAX_ITEMS = 30;

function actionLabel(action: string) {
  const map: Record<string, string> = {
    user_signup: "signed up",
    household_created: "created a household",
    person_added: "added a person",
    document_uploaded: "uploaded a document",
    ai_scan_performed: "performed an AI scan",
  };
  return map[action] ?? action;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function DashboardRecentActivity({
  initialActivity,
  initialTotal,
}: {
  initialActivity: ActivityEntry[];
  initialTotal: number;
}) {
  const [activity, setActivity] = useState<ActivityEntry[]>(initialActivity);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const cappedTotal = Math.min(initialTotal, MAX_ITEMS);
  const totalPages = Math.ceil(cappedTotal / PER_PAGE);

  async function goToPage(p: number) {
    if (p === 1) { setPage(1); setActivity(initialActivity); return; }
    setLoading(true);
    const res = await fetch(`/api/admin/activity?page=${p}&perPage=${PER_PAGE}`);
    const data = await res.json();
    setActivity(data.activity ?? []);
    setPage(p);
    setLoading(false);
  }

  return (
    <div className={`bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden ${loading ? "opacity-50" : ""}`}>
      {activity.length === 0 ? (
        <p className="px-4 py-6 text-center text-warmstone-400 text-sm">
          No activity logged yet. Activity is recorded as users interact with the app.
        </p>
      ) : (
        <div className="divide-y divide-warmstone-50">
          {activity.map((log) => (
            <div key={log.id} className="px-4 py-3 hover:bg-warmstone-50">
              <p className="text-sm text-warmstone-900">
                <span className="font-medium">{log.user_name ?? log.user_email ?? "Unknown user"}</span>
                {" "}
                <span className="text-warmstone-600">{actionLabel(log.action)}</span>
              </p>
              {log.entity_type && (
                <p className="text-xs text-warmstone-400 mt-0.5 capitalize">{log.entity_type.replace(/_/g, " ")}</p>
              )}
              <p className="text-xs text-warmstone-400 mt-0.5">{formatRelative(log.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="border-t border-warmstone-100 px-4 py-2.5 flex items-center justify-between">
          <p className="text-xs text-warmstone-400">{page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1 rounded hover:bg-warmstone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} className="text-warmstone-600" />
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1 rounded hover:bg-warmstone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} className="text-warmstone-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
