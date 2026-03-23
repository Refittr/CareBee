"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, X, Users, UserCircle, FileText } from "lucide-react";

interface AdminHousehold {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count: number;
  people_count: number;
  owner_name: string | null;
  owner_email: string | null;
}

interface HouseholdDetail {
  household: { id: string; name: string; created_at: string };
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

function HouseholdDetailPanel({
  householdId,
  onClose,
}: {
  householdId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<HouseholdDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/households/${householdId}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setLoading(false);
      });
  }, [householdId]);

  const roleLabel: Record<string, string> = {
    owner: "Owner",
    editor: "Editor",
    viewer: "Viewer",
    emergency_only: "Emergency only",
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end">
      <div className="bg-warmstone-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-warmstone-200 sticky top-0 bg-warmstone-white">
          <h2 className="font-bold text-warmstone-900">
            {detail?.household.name ?? "Loading..."}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-warmstone-100 transition-colors"
          >
            <X size={16} className="text-warmstone-600" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-warmstone-400 text-sm">Loading...</p>
          </div>
        ) : detail ? (
          <div className="flex-1 p-5 flex flex-col gap-6">
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
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 py-2 border-b border-warmstone-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-warmstone-900">
                        {m.full_name ?? m.email ?? "Unknown"}
                      </p>
                      {m.full_name && (
                        <p className="text-xs text-warmstone-400">{m.email}</p>
                      )}
                    </div>
                    <span className="text-xs text-warmstone-500 shrink-0">
                      {roleLabel[m.role] ?? m.role}
                    </span>
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
                  <div
                    key={p.id}
                    className="py-2 border-b border-warmstone-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-warmstone-900">
                      {p.first_name} {p.last_name}
                    </p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-warmstone-400">
                        {p.conditions_count} conditions
                      </span>
                      <span className="text-xs text-warmstone-400">
                        {p.medications_count} medications
                      </span>
                      <span className="text-xs text-warmstone-400 flex items-center gap-1">
                        <FileText size={11} />
                        {p.documents_count} docs
                      </span>
                    </div>
                  </div>
                ))}
                {detail.people.length === 0 && (
                  <p className="text-sm text-warmstone-400">
                    No people added yet.
                  </p>
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
  );
}

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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  const fetchHouseholds = useCallback(async (q: string, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
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
    await fetchHouseholds(search, 1);
  }

  async function handlePage(p: number) {
    setPage(p);
    await fetchHouseholds(search, p);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div>
      {selectedId && (
        <HouseholdDetailPanel
          householdId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
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

      <div className="bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warmstone-200 bg-warmstone-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500">Household</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500 hidden md:table-cell">Owner</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warmstone-500">Members</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warmstone-500">People</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500 hidden lg:table-cell">Created</th>
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
                  <td className="px-4 py-3 text-right text-warmstone-600 font-medium text-xs">
                    {h.member_count}
                  </td>
                  <td className="px-4 py-3 text-right text-warmstone-600 font-medium text-xs">
                    {h.people_count}
                  </td>
                  <td className="px-4 py-3 text-xs text-warmstone-500 hidden lg:table-cell">
                    {formatDate(h.created_at)}
                  </td>
                </tr>
              ))}
              {households.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-warmstone-400">
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
