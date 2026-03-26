"use client";

import { useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, X, AlertTriangle, Trash2, KeyRound, Mail, Save } from "lucide-react";
import type { AccountType } from "@/lib/types/database";
import type { UserSubStatus } from "@/app/api/admin/users/route";

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  account_type: AccountType;
  created_at: string;
  updated_at: string;
  household_count: number;
  people_count: number;
  subscription_status: UserSubStatus;
  subscription_days_left: number | null;
}

const subBadgeStyle: Record<UserSubStatus, string> = {
  active: "bg-sage-100 text-sage-700 border border-sage-300",
  trial_active: "bg-honey-100 text-honey-700 border border-honey-300",
  trial_expired: "bg-warmstone-100 text-warmstone-500 border border-warmstone-200",
  past_due: "bg-red-100 text-red-700 border border-red-300",
  cancelled: "bg-warmstone-100 text-warmstone-400 border border-warmstone-200",
  free: "bg-warmstone-100 text-warmstone-500 border border-warmstone-200",
  none: "bg-warmstone-50 text-warmstone-400 border border-warmstone-100",
};

const subBadgeLabel: Record<UserSubStatus, string> = {
  active: "Plus",
  trial_active: "Trial",
  trial_expired: "Expired",
  past_due: "Past due",
  cancelled: "Cancelled",
  free: "Free",
  none: "—",
};

function SubBadge({ status, daysLeft }: { status: UserSubStatus; daysLeft: number | null }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subBadgeStyle[status]}`}>
      {subBadgeLabel[status]}
      {status === "trial_active" && daysLeft !== null && ` · ${daysLeft}d`}
    </span>
  );
}

const accountTypeBadge: Record<AccountType, string> = {
  admin: "bg-honey-100 text-honey-700 border border-honey-300",
  tester: "bg-sage-100 text-sage-700 border border-sage-300",
  standard: "bg-warmstone-100 text-warmstone-600 border border-warmstone-200",
};

function ConfirmDialog({
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-warmstone-white rounded-xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className={danger ? "text-error shrink-0 mt-0.5" : "text-honey-500 shrink-0 mt-0.5"} />
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
            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${
              danger
                ? "bg-error text-white hover:opacity-90"
                : "bg-honey-400 text-warmstone-white hover:bg-honey-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserDetailPanel({
  user,
  onClose,
  onUpdate,
  onDelete,
}: {
  user: AdminUser;
  onClose: () => void;
  onUpdate: (updated: AdminUser) => void;
  onDelete: (userId: string) => void;
}) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [accountType, setAccountType] = useState<AccountType>(user.account_type);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [confirm, setConfirm] = useState<{
    message: string;
    confirmLabel: string;
    danger?: boolean;
    action: () => void;
  } | null>(null);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, email, account_type: accountType }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setSaveError(data.error ?? "Failed to save.");
    } else {
      setSaveSuccess(true);
      onUpdate({ ...user, full_name: fullName, email, account_type: accountType });
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  async function runAction(key: string, endpoint: string, successMsg: string) {
    setActionLoading(key);
    setActionMsg(null);
    const res = await fetch(endpoint, { method: "POST" });
    const data = await res.json();
    setActionLoading(null);
    if (!res.ok) {
      setActionMsg({ type: "err", text: data.error ?? "Something went wrong." });
    } else {
      setActionMsg({ type: "ok", text: successMsg });
      setTimeout(() => setActionMsg(null), 4000);
    }
  }

  async function handleDelete() {
    setActionLoading("delete");
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json();
    setActionLoading(null);
    if (!res.ok) {
      setActionMsg({ type: "err", text: data.error ?? "Failed to delete user." });
    } else {
      onDelete(user.id);
      onClose();
    }
  }

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1" onClick={onClose} />
        <div className="w-full max-w-md bg-warmstone-white border-l border-warmstone-200 shadow-2xl flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-warmstone-100 shrink-0">
            <div>
              <p className="font-bold text-warmstone-900">{user.full_name}</p>
              <p className="text-xs text-warmstone-400">{user.email}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-warmstone-100 transition-colors">
              <X size={18} className="text-warmstone-500" />
            </button>
          </div>

          <div className="flex-1 px-6 py-5 flex flex-col gap-6">
            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-warmstone-500">
              <span>Joined {formatDate(user.created_at)}</span>
              <span>·</span>
              <span>{user.household_count} household{user.household_count !== 1 ? "s" : ""}</span>
              <span>·</span>
              <SubBadge status={user.subscription_status} daysLeft={user.subscription_days_left} />
            </div>

            {/* Edit form */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Edit profile</p>
              <div>
                <label className="block text-xs font-semibold text-warmstone-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-900 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warmstone-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-900 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warmstone-700 mb-1">Account type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-700 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
                >
                  <option value="standard">Standard</option>
                  <option value="tester">Tester</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {saveError && <p className="text-xs text-error">{saveError}</p>}
              {saveSuccess && <p className="text-xs text-sage-600">Changes saved.</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 justify-center px-4 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

            {/* Auth actions */}
            <div className="flex flex-col gap-3 border-t border-warmstone-100 pt-5">
              <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Auth actions</p>
              {actionMsg && (
                <p className={`text-xs ${actionMsg.type === "ok" ? "text-sage-600" : "text-error"}`}>
                  {actionMsg.text}
                </p>
              )}
              <button
                onClick={() =>
                  setConfirm({
                    message: `Send a password reset email to ${user.email}?`,
                    confirmLabel: "Send",
                    action: () => runAction("reset", `/api/admin/users/${user.id}/password-reset`, "Password reset email sent."),
                  })
                }
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-warmstone-700 border border-warmstone-200 rounded-md hover:bg-warmstone-50 transition-colors disabled:opacity-50"
              >
                <KeyRound size={14} className="text-warmstone-400" />
                Send password reset link
              </button>
              <button
                onClick={() =>
                  setConfirm({
                    message: `Resend a confirmation email to ${user.email}?`,
                    confirmLabel: "Send",
                    action: () => runAction("confirm", `/api/admin/users/${user.id}/resend-confirmation`, "Confirmation email sent."),
                  })
                }
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-warmstone-700 border border-warmstone-200 rounded-md hover:bg-warmstone-50 transition-colors disabled:opacity-50"
              >
                <Mail size={14} className="text-warmstone-400" />
                Resend confirmation email
              </button>
            </div>

            {/* Danger zone */}
            <div className="flex flex-col gap-3 border-t border-warmstone-100 pt-5">
              <p className="text-xs font-semibold text-error uppercase tracking-wide">Danger zone</p>
              <button
                onClick={() =>
                  setConfirm({
                    message: `Permanently delete ${user.full_name ?? user.email}? This will remove their account and all associated data. This cannot be undone.`,
                    confirmLabel: "Delete user",
                    danger: true,
                    action: handleDelete,
                  })
                }
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-error border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                Delete user
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const subFilterOptions: { value: string; label: string }[] = [
  { value: "", label: "All users" },
  { value: "plus", label: "Plus subscribers" },
  { value: "trial", label: "In trial" },
  { value: "trial_expired", label: "Trial expired" },
  { value: "free", label: "Free" },
  { value: "cancelled", label: "Cancelled" },
  { value: "none", label: "No care record" },
];

export function UsersClient({ initialUsers, initialTotal }: { initialUsers: AdminUser[]; initialTotal: number }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  const fetchUsers = useCallback(async (q: string, p: number, sub: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("search", q);
    if (sub) params.set("subscription", sub);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    await fetchUsers(search, 1, subFilter);
  }

  async function handleSubFilter(sub: string) {
    setSubFilter(sub);
    setPage(1);
    await fetchUsers(search, 1, sub);
  }

  async function handlePage(p: number) {
    setPage(p);
    await fetchUsers(search, p, subFilter);
  }

  function handleUpdate(updated: AdminUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setSelectedUser(updated);
  }

  function handleDelete(userId: string) {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setTotal((t) => t - 1);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  return (
    <div>
      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
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
        <select
          value={subFilter}
          onChange={(e) => handleSubFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-700 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
        >
          {subFilterOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warmstone-200 bg-warmstone-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500 hidden lg:table-cell">Subscription</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warmstone-500 hidden md:table-cell">Signed up</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warmstone-500">HH</th>
              </tr>
            </thead>
            <tbody className={loading ? "opacity-50" : undefined}>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="border-b border-warmstone-50 last:border-0 hover:bg-warmstone-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-warmstone-900 truncate max-w-[180px]">{u.full_name}</p>
                    <p className="text-xs text-warmstone-400 truncate max-w-[180px]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accountTypeBadge[u.account_type] ?? accountTypeBadge.standard}`}>
                      {u.account_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <SubBadge status={u.subscription_status} daysLeft={u.subscription_days_left} />
                  </td>
                  <td className="px-4 py-3 text-xs text-warmstone-500 hidden md:table-cell">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-warmstone-600 font-medium text-xs">
                    {u.household_count}
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
            <p className="text-xs text-warmstone-500">{total} users total</p>
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
