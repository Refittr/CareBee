"use client";

import { useState, useCallback } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import type { AccountType } from "@/lib/types/database";

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  account_type: AccountType;
  created_at: string;
  updated_at: string;
  household_count: number;
  people_count: number;
}

const accountTypeBadge: Record<AccountType, string> = {
  admin: "bg-honey-100 text-honey-700 border border-honey-300",
  tester: "bg-sage-100 text-sage-700 border border-sage-300",
  standard: "bg-warmstone-100 text-warmstone-600 border border-warmstone-200",
};

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-warmstone-white rounded-xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-honey-500 shrink-0 mt-0.5" />
          <p className="text-sm text-warmstone-800 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-warmstone-600 hover:text-warmstone-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionsDropdown({
  user,
  onChangeType,
}: {
  user: AdminUser;
  onChangeType: (userId: string, type: AccountType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    message: string;
    action: () => void;
  } | null>(null);

  function handleAction(type: AccountType) {
    setOpen(false);
    if (type === "admin") {
      setConfirm({
        message:
          "Are you sure you want to make this user an admin? They will have access to all data on the platform.",
        action: () => {
          onChangeType(user.id, "admin");
          setConfirm(null);
        },
      });
    } else {
      onChangeType(user.id, type);
    }
  }

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-warmstone-600 border border-warmstone-200 rounded-md hover:bg-warmstone-50 transition-colors"
        >
          Actions
          <ChevronDown size={12} />
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 bg-warmstone-white border border-warmstone-200 rounded-lg shadow-lg min-w-[160px] py-1">
              {user.account_type !== "tester" && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-warmstone-700 hover:bg-warmstone-50 transition-colors"
                  onClick={() => handleAction("tester")}
                >
                  Set as tester
                </button>
              )}
              {user.account_type === "tester" && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-warmstone-700 hover:bg-warmstone-50 transition-colors"
                  onClick={() => handleAction("standard")}
                >
                  Remove tester
                </button>
              )}
              {user.account_type !== "admin" && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-warmstone-700 hover:bg-warmstone-50 transition-colors"
                  onClick={() => handleAction("admin")}
                >
                  Set as admin
                </button>
              )}
              {user.account_type === "admin" && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-warmstone-700 hover:bg-warmstone-50 transition-colors"
                  onClick={() => handleAction("standard")}
                >
                  Remove admin
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function UsersClient({ initialUsers, initialTotal }: { initialUsers: AdminUser[]; initialTotal: number }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("search", q);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    await fetchUsers(search, 1);
  }

  async function handlePage(p: number) {
    setPage(p);
    await fetchUsers(search, p);
  }

  async function handleChangeType(userId: string, type: AccountType) {
    await fetch(`/api/admin/users/${userId}/account-type`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_type: type }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, account_type: type } : u))
    );
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
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warmstone-400" />
          <input
            type="text"
            placeholder="Search by name or email"
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500 hidden md:table-cell">Signed up</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warmstone-500">HH</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className={loading ? "opacity-50" : undefined}>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-warmstone-50 last:border-0 hover:bg-warmstone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-warmstone-900 truncate max-w-[180px]">{u.full_name}</p>
                    <p className="text-xs text-warmstone-400 truncate max-w-[180px]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accountTypeBadge[u.account_type] ?? accountTypeBadge.standard}`}>
                      {u.account_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-warmstone-500 hidden md:table-cell">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-warmstone-600 font-medium text-xs">
                    {u.household_count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionsDropdown user={u} onChangeType={handleChangeType} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-warmstone-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-warmstone-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-warmstone-500">
              {total} users total
            </p>
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
