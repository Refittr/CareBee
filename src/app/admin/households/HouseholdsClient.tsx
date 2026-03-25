"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, X, Users, UserCircle, FileText, CreditCard, AlertTriangle } from "lucide-react";

interface AdminHousehold {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count: number;
  people_count: number;
  owner_name: string | null;
  owner_email: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  trial_days_left: number | null;
}

interface HouseholdDetail {
  household: {
    id: string;
    name: string;
    created_at: string;
    subscription_status: string | null;
    trial_ends_at: string | null;
    subscription_started_at: string | null;
    subscription_ends_at: string | null;
    subscription_id: string | null;
    stripe_customer_id: string | null;
  };
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    accepted_at: string | null;
    full_name?: string;
    email?: string;
  }>;
  people: Array<{
    id: string;
    first_name: string;
    last_name: string;
    conditions_count: number;
    medications_count: number;
    documents_count: number;
  }>;
}

const planBadgeStyle: Record<string, string> = {
  active: "bg-sage-100 text-sage-700 border border-sage-300",
  trial: "bg-honey-100 text-honey-700 border border-honey-300",
  free: "bg-warmstone-100 text-warmstone-500 border border-warmstone-200",
  cancelled: "bg-warmstone-100 text-warmstone-400 border border-warmstone-200",
  past_due: "bg-red-100 text-red-700 border border-red-300",
};

function PlanBadge({ status, daysLeft }: { status: string | null; daysLeft: number | null }) {
  if (!status) return <span className="text-xs text-warmstone-300">—</span>;
  const label = status === "active" ? "Plus" : status === "trial" ? "Trial" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeStyle[status] ?? planBadgeStyle.free}`}>
      {label}
      {status === "trial" && daysLeft !== null && ` · ${daysLeft}d`}
    </span>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-warmstone-white rounded-xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-honey-500 shrink-0 mt-0.5" />
          <p className="text-sm text-warmstone-800 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-warmstone-600 hover:text-warmstone-900 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function HouseholdDetailPanel({ householdId, onClose }: { householdId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<HouseholdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; action: () => Promise<void> } | null>(null);

  function loadDetail() {
    setLoading(true);
    fetch(`/api/admin/households/${householdId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setLoading(false);
      });
  }

  useEffect(() => { loadDetail(); }, [householdId]);

  async function runAction(path: string) {
    setActionLoading(true);
    await fetch(`/api/admin/households/${householdId}/${path}`, { method: "POST" });
    setActionLoading(false);
    loadDetail();
  }

  const roleLabel: Record<string, string> = {
    owner: "Owner",
    editor: "Editor",
    viewer: "Viewer",
    emergency_only: "Emergency only",
  };

  const sub = detail?.household;
  const trialDaysLeft = sub?.subscription_status === "trial" && sub.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={async () => { await confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end">
        <div className="bg-warmstone-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-warmstone-200 sticky top-0 bg-warmstone-white">
            <h2 className="font-bold text-warmstone-900">{detail?.household.name ?? "Loading..."}</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-warmstone-100 transition-colors">
              <X size={16} className="text-warmstone-600" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-warmstone-400 text-sm">Loading...</p>
            </div>
          ) : detail ? (
            <div className="flex-1 p-5 flex flex-col gap-6">
              {/* Subscription */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={14} className="text-warmstone-500" />
                  <h3 className="text-xs font-bold text-warmstone-600 uppercase tracking-wide">Subscription</h3>
                </div>
                <div className="bg-warmstone-50 rounded-lg p-4 flex flex-col gap-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-warmstone-500">Plan</span>
                    <PlanBadge status={sub?.subscription_status ?? null} daysLeft={trialDaysLeft} />
                  </div>
                  {sub?.subscription_status === "trial" && sub.trial_ends_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-warmstone-500">Trial ends</span>
                      <span className="text-xs text-warmstone-700">{formatDate(sub.trial_ends_at)}</span>
                    </div>
                  )}
                  {sub?.subscription_started_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-warmstone-500">Subscribed since</span>
                      <span className="text-xs text-warmstone-700">{formatDate(sub.subscription_started_at)}</span>
                    </div>
                  )}
                  {sub?.stripe_customer_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-warmstone-500">Stripe customer</span>
                      <span className="text-xs text-warmstone-400 font-mono truncate max-w-[160px]">{sub.stripe_customer_id}</span>
                    </div>
                  )}
                </div>
                {/* Admin actions */}
                <div className="flex flex-wrap gap-2">
                  {(sub?.subscription_status === "trial" || sub?.subscription_status === "free" || sub?.subscription_status === "cancelled") && (
                    <button
                      disabled={actionLoading}
                      onClick={() => setConfirm({
                        message: "Extend the trial by 30 days from today?",
                        action: () => runAction("extend-trial"),
                      })}
                      className="px-3 py-1.5 text-xs font-medium border border-honey-300 text-honey-700 bg-honey-50 rounded-md hover:bg-honey-100 transition-colors disabled:opacity-50"
                    >
                      Extend trial +30d
                    </button>
                  )}
                  {sub?.subscription_status !== "active" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => setConfirm({
                        message: "Grant this household a free Plus subscription? This will not create a Stripe subscription.",
                        action: () => runAction("grant-plus"),
                      })}
                      className="px-3 py-1.5 text-xs font-medium border border-sage-300 text-sage-700 bg-sage-50 rounded-md hover:bg-sage-100 transition-colors disabled:opacity-50"
                    >
                      Grant Plus
                    </button>
                  )}
                  {sub?.subscription_status === "active" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => setConfirm({
                        message: "Revoke Plus access? This will downgrade to free. It will not cancel a Stripe subscription.",
                        action: () => runAction("revoke-plus"),
                      })}
                      className="px-3 py-1.5 text-xs font-medium border border-warmstone-300 text-warmstone-600 bg-warmstone-50 rounded-md hover:bg-warmstone-100 transition-colors disabled:opacity-50"
                    >
                      Revoke Plus
                    </button>
                  )}
                </div>
              </div>

              {/* Members */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-warmstone-500" />
                  <h3 className="text-xs font-bold text-warmstone-600 uppercase tracking-wide">
                    Members ({detail.members.length})
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 py-2 border-b border-warmstone-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-warmstone-900">{m.full_name ?? m.email ?? "Unknown"}</p>
                        {m.full_name && <p className="text-xs text-warmstone-400">{m.email}</p>}
                      </div>
                      <span className="text-xs text-warmstone-500 shrink-0">{roleLabel[m.role] ?? m.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* People */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCircle size={14} className="text-warmstone-500" />
                  <h3 className="text-xs font-bold text-warmstone-600 uppercase tracking-wide">
                    People in care ({detail.people.length})
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {detail.people.map((p) => (
                    <div key={p.id} className="py-2 border-b border-warmstone-50 last:border-0">
                      <p className="text-sm font-medium text-warmstone-900">{p.first_name} {p.last_name}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-warmstone-400">{p.conditions_count} conditions</span>
                        <span className="text-xs text-warmstone-400">{p.medications_count} medications</span>
                        <span className="text-xs text-warmstone-400 flex items-center gap-1">
                          <FileText size={11} />
                          {p.documents_count} docs
                        </span>
                      </div>
                    </div>
                  ))}
                  {detail.people.length === 0 && (
                    <p className="text-sm text-warmstone-400">No people added yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-warmstone-400 text-sm">Could not load details.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "trial_ending", label: "Trial ending" },
];

export function HouseholdsClient({
  initialHouseholds,
  initialTotal,
}: {
  initialHouseholds: AdminHousehold[];
  initialTotal: number;
}) {
  const [households, setHouseholds] = useState<AdminHousehold[]>(initialHouseholds);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  const fetchHouseholds = useCallback(async (q: string, p: number, s: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), sort: s });
    if (q) params.set("search", q);
    const res = await fetch(`/api/admin/households?${params}`);
    const data = await res.json();
    setHouseholds(data.households ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    await fetchHouseholds(search, 1, sort);
  }

  async function handleSort(s: string) {
    setSort(s);
    setPage(1);
    await fetchHouseholds(search, 1, s);
  }

  async function handlePage(p: number) {
    setPage(p);
    await fetchHouseholds(search, p, sort);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div>
      {selectedId && (
        <HouseholdDetailPanel householdId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warmstone-400" />
            <input
              type="text"
              placeholder="Search by household name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-900 placeholder:text-warmstone-400 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors"
          >
            Search
          </button>
        </form>
        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value)}
          className="px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-700 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warmstone-200 bg-warmstone-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500">Household</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500 hidden md:table-cell">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500 hidden lg:table-cell">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warmstone-500">Members</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warmstone-500">People</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500 hidden xl:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className={loading ? "opacity-50" : undefined}>
              {households.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-warmstone-50 last:border-0 hover:bg-warmstone-50 cursor-pointer"
                  onClick={() => setSelectedId(h.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-warmstone-900">{h.name}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-warmstone-700 truncate max-w-[160px]">{h.owner_name ?? "Unknown"}</p>
                    <p className="text-xs text-warmstone-400 truncate max-w-[160px]">{h.owner_email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <PlanBadge status={h.subscription_status} daysLeft={h.trial_days_left} />
                  </td>
                  <td className="px-4 py-3 text-right text-warmstone-600 font-medium text-xs">
                    {h.member_count}
                  </td>
                  <td className="px-4 py-3 text-right text-warmstone-600 font-medium text-xs">
                    {h.people_count}
                  </td>
                  <td className="px-4 py-3 text-xs text-warmstone-500 hidden xl:table-cell">
                    {formatDate(h.created_at)}
                  </td>
                </tr>
              ))}
              {households.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-warmstone-400">
                    No households found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-warmstone-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-warmstone-500">{total} households total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded-md hover:bg-warmstone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-warmstone-600" />
              </button>
              <span className="text-xs text-warmstone-600">{page} / {totalPages}</span>
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
