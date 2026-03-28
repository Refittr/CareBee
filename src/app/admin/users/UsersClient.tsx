"use client";

import { useState, useCallback, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, X, AlertTriangle, Trash2, KeyRound, Mail, Save } from "lucide-react";
import type { AccountType } from "@/lib/types/database";
import type { UserSubStatus } from "@/app/api/admin/users/route";

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  account_type: AccountType;
  created_at: string;
  updated_at?: string;
  household_count: number;
  people_count: number;
  subscription_status: UserSubStatus;
  subscription_days_left: number | null;
  last_sign_in_at: string | null;
  ai_count: number;
  docs_scanned: number;
  last_ai_at: string | null;
}

type ActivityReport = {
  households: Array<{
    id: string;
    name: string;
    created_at: string;
    subscription_status: string;
    trial_ends_at: string | null;
    people: Array<{
      id: string;
      first_name: string;
      last_name: string | null;
      created_at: string;
      conditions_count: number;
      medications_count: number;
      appointments_count: number;
      care_notes_count: number;
      test_results_count: number;
      documents_count: number;
    }>;
    members: Array<{ role: string; accepted_at: string | null; user_id: string }>;
  }>;
  total_people: number;
  documents: {
    total: number;
    with_ai: number;
    first_upload: string | null;
    last_upload: string | null;
    by_type: Record<string, number>;
  };
  ai_calls: {
    total: number;
    by_feature: Record<string, number>;
    first_at: string | null;
    last_at: string | null;
  };
  feature_usage: {
    total: number;
    by_feature: Record<string, number>;
  };
  page_views: number;
};

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
  none: "-",
};

function SubBadge({ status, daysLeft }: { status: UserSubStatus; daysLeft: number | null }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${subBadgeStyle[status]}`}>
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

const docTypeLabel: Record<string, string> = {
  clinical_letter: "Clinical letter",
  prescription: "Prescription",
  test_result: "Test result",
  imaging_report: "Imaging",
  benefit_letter: "Benefit",
  care_document: "Care doc",
  legal_document: "Legal",
  appointment_letter: "Appt letter",
  discharge_summary: "Discharge",
  referral_letter: "Referral",
  other: "Other",
  unrecognised: "Unrecognised",
};

const featureLabel: Record<string, string> = {
  document_scan: "Document scan",
  health_insight: "Health insight",
  appointment_prep: "Appt prep",
  appointment_debrief: "Appt debrief",
  letter_generator: "Letter generator",
  drug_interaction: "Drug interaction",
  conditions: "Conditions",
  medications: "Medications",
  appointments: "Appointments",
  documents: "Documents",
  care_notes: "Care notes",
  test_results: "Test results",
  people: "People",
  household: "Household",
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
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
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

function DeleteUserModal({
  user,
  onCancel,
  onDeleted,
}: {
  user: AdminUser;
  onCancel: () => void;
  onDeleted: (userId: string) => void;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emailMatches = emailInput.trim().toLowerCase() === user.email.trim().toLowerCase();

  async function handleDelete() {
    if (!emailMatches) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
    } else {
      onDeleted(user.id);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-warmstone-white rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-error" />
            </div>
            <div>
              <h2 className="font-bold text-warmstone-900 text-base">Delete user</h2>
              <p className="text-xs text-warmstone-500 mt-0.5">{user.full_name || user.email}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-warmstone-100 transition-colors shrink-0"
          >
            <X size={16} className="text-warmstone-500" />
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-800 leading-relaxed">
            Are you sure you want to delete this user? This will permanently remove their profile,
            all health records, documents, and household data. This cannot be undone.
          </p>
        </div>

        <div className="text-sm text-warmstone-600 leading-relaxed">
          <p>The following will be permanently deleted:</p>
          <ul className="mt-2 space-y-1 text-xs text-warmstone-500 list-disc list-inside">
            <li>Profile and account</li>
            <li>All owned households and care records</li>
            <li>All people, medications, conditions, documents, and appointments</li>
            <li>All health insights, entitlements, and generated letters</li>
            <li>Usage logs and activity history</li>
          </ul>
          <p className="mt-2 text-xs text-warmstone-400">
            Stripe billing records are kept for accounting purposes.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warmstone-700 mb-1.5">
            Type <span className="font-mono text-warmstone-900">{user.email}</span> to confirm
          </label>
          <input
            ref={inputRef}
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && emailMatches) handleDelete(); }}
            placeholder={user.email}
            autoFocus
            className="w-full px-3 py-2 text-sm border-2 border-red-300 rounded-md bg-warmstone-white text-warmstone-900 placeholder:text-warmstone-300 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
        </div>

        {error && (
          <p className="text-xs text-error bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-warmstone-600 hover:text-warmstone-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!emailMatches || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-error text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            {loading ? "Deleting..." : "Delete user"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ user, report }: { user: AdminUser; report: ActivityReport }) {
  function fmt(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const validStatuses: UserSubStatus[] = ["active", "trial_active", "trial_expired", "past_due", "cancelled", "free", "none"];

  const firstPersonDate = report.households.flatMap((h) => h.people)[0]?.created_at ?? null;

  const funnelSteps: { label: string; done: boolean; date: string | null }[] = [
    { label: "Signed up", done: true, date: user.created_at },
    { label: "Created care record", done: report.households.length > 0, date: report.households[0]?.created_at ?? null },
    { label: "Added people", done: report.total_people > 0, date: firstPersonDate },
    { label: "Uploaded document", done: report.documents.total > 0, date: report.documents.first_upload },
    { label: "Used AI", done: report.ai_calls.total > 0 || report.documents.with_ai > 0, date: report.ai_calls.first_at },
  ];

  type InsightLevel = "error" | "warn" | "info" | "ok";
  const insight: { level: InsightLevel; message: string } = (() => {
    if (report.households.length === 0)
      return { level: "error", message: "User signed up but has not created any care records. Setup is incomplete." };
    if (report.total_people === 0)
      return { level: "warn", message: "Care record created but no people added. User stopped after the first step." };
    if (report.documents.total === 0)
      return { level: "warn", message: "People added but no documents uploaded. User has set up their record but never used the scan feature." };
    if (report.ai_calls.total === 0 && report.documents.with_ai === 0)
      return { level: "info", message: "Documents uploaded but no AI features used. All uploads were done without scanning." };
    return { level: "ok", message: "Active user engaging with core features." };
  })();

  const insightStyle: Record<InsightLevel, string> = {
    error: "bg-red-50 border-red-200 text-red-700",
    warn: "bg-honey-50 border-honey-300 text-honey-700",
    info: "bg-warmstone-50 border-warmstone-200 text-warmstone-600",
    ok: "bg-sage-50 border-sage-200 text-sage-700",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Diagnostic banner */}
      <div className={`text-xs px-3 py-2.5 rounded-lg border leading-relaxed font-medium ${insightStyle[insight.level]}`}>
        {insight.message}
      </div>

      {/* Engagement funnel */}
      <div>
        <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide mb-3">Engagement funnel</p>
        <div className="flex flex-col">
          {funnelSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.done ? "bg-sage-200 text-sage-700" : "bg-warmstone-100 text-warmstone-400"
                }`}>
                  {step.done ? "✓" : "·"}
                </div>
                {i < funnelSteps.length - 1 && (
                  <div className={`w-px h-4 ${step.done && funnelSteps[i + 1].done ? "bg-sage-200" : "bg-warmstone-100"}`} />
                )}
              </div>
              <div className="pb-3 flex items-baseline gap-2">
                <span className={`text-sm font-medium ${step.done ? "text-warmstone-900" : "text-warmstone-400"}`}>
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-xs text-warmstone-400">{fmt(step.date)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Care records */}
      {report.households.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide mb-3">
            Care records ({report.households.length})
          </p>
          <div className="flex flex-col gap-3">
            {report.households.map((h) => {
              const safeStatus: UserSubStatus = validStatuses.includes(h.subscription_status as UserSubStatus)
                ? (h.subscription_status as UserSubStatus)
                : "free";
              return (
                <div key={h.id} className="border border-warmstone-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 bg-warmstone-50 flex items-center justify-between gap-2 border-b border-warmstone-100">
                    <span className="text-sm font-semibold text-warmstone-900 truncate">{h.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-warmstone-400">{fmt(h.created_at)}</span>
                      <SubBadge status={safeStatus} daysLeft={null} />
                    </div>
                  </div>
                  {h.people.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-warmstone-100 bg-warmstone-50/50">
                            <th className="text-left px-3 py-1.5 text-warmstone-400 font-medium whitespace-nowrap">Person</th>
                            <th className="text-left px-2 py-1.5 text-warmstone-400 font-medium whitespace-nowrap">Added</th>
                            <th className="text-center px-2 py-1.5 text-warmstone-400 font-medium" title="Conditions">Cond</th>
                            <th className="text-center px-2 py-1.5 text-warmstone-400 font-medium" title="Medications">Meds</th>
                            <th className="text-center px-2 py-1.5 text-warmstone-400 font-medium" title="Appointments">Appts</th>
                            <th className="text-center px-2 py-1.5 text-warmstone-400 font-medium" title="Test results">Tests</th>
                            <th className="text-center px-2 py-1.5 text-warmstone-400 font-medium" title="Documents">Docs</th>
                            <th className="text-center px-2 py-1.5 text-warmstone-400 font-medium" title="Care notes">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {h.people.map((p) => (
                            <tr key={p.id} className="border-b border-warmstone-50 last:border-0 hover:bg-warmstone-50/50">
                              <td className="px-3 py-2 font-medium text-warmstone-800 whitespace-nowrap">
                                {p.first_name}{p.last_name ? ` ${p.last_name}` : ""}
                              </td>
                              <td className="px-2 py-2 text-warmstone-400 whitespace-nowrap">{fmt(p.created_at)}</td>
                              <Stat v={p.conditions_count} />
                              <Stat v={p.medications_count} />
                              <Stat v={p.appointments_count} />
                              <Stat v={p.test_results_count} />
                              <Stat v={p.documents_count} highlight />
                              <Stat v={p.care_notes_count} />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="px-3 py-2.5 text-xs text-warmstone-400">No people added.</p>
                  )}
                  {h.members.length > 0 && (
                    <div className="px-3 py-2 bg-warmstone-50 border-t border-warmstone-100 text-xs text-warmstone-500">
                      Care circle: {h.members.length} other member{h.members.length !== 1 ? "s" : ""}
                      {" "}({h.members.filter((m) => m.accepted_at).length} accepted)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide mb-3">Documents</p>
        {report.documents.total === 0 ? (
          <p className="text-xs text-warmstone-400">No documents uploaded.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-5 text-sm">
              <span>
                <span className="font-semibold text-warmstone-900">{report.documents.total}</span>
                <span className="text-warmstone-500 ml-1">uploaded</span>
              </span>
              <span>
                <span className={`font-semibold ${report.documents.with_ai > 0 ? "text-honey-700" : "text-warmstone-400"}`}>
                  {report.documents.with_ai}
                </span>
                <span className="text-warmstone-500 ml-1">AI-scanned</span>
              </span>
            </div>
            <p className="text-xs text-warmstone-400">
              First: {fmt(report.documents.first_upload) ?? "—"}&nbsp;&nbsp;Last: {fmt(report.documents.last_upload) ?? "—"}
            </p>
            {Object.keys(report.documents.by_type).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(report.documents.by_type)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <span key={type} className="text-xs px-2 py-0.5 bg-warmstone-100 text-warmstone-600 rounded-full">
                      {docTypeLabel[type] ?? type} ({count})
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI usage */}
      <div>
        <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide mb-3">AI usage</p>
        {report.ai_calls.total === 0 ? (
          <p className="text-xs text-warmstone-400">No AI API calls logged.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-5 text-sm">
              <span>
                <span className="font-semibold text-warmstone-900">{report.ai_calls.total}</span>
                <span className="text-warmstone-500 ml-1">API calls</span>
              </span>
            </div>
            <p className="text-xs text-warmstone-400">
              First: {fmt(report.ai_calls.first_at) ?? "—"}&nbsp;&nbsp;Last: {fmt(report.ai_calls.last_at) ?? "—"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(report.ai_calls.by_feature)
                .sort(([, a], [, b]) => b - a)
                .map(([feature, count]) => (
                  <span key={feature} className="text-xs px-2 py-0.5 bg-honey-50 text-honey-700 border border-honey-200 rounded-full">
                    {featureLabel[feature] ?? feature} ({count})
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Feature interactions */}
      {report.feature_usage.total > 0 && (
        <div>
          <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide mb-3">Feature interactions</p>
          <div className="flex gap-5 text-sm mb-2">
            <span>
              <span className="font-semibold text-warmstone-900">{report.feature_usage.total}</span>
              <span className="text-warmstone-500 ml-1">tracked</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(report.feature_usage.by_feature)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 12)
              .map(([feature, count]) => (
                <span key={feature} className="text-xs px-2 py-0.5 bg-warmstone-100 text-warmstone-600 rounded-full">
                  {featureLabel[feature] ?? feature} ({count})
                </span>
              ))}
          </div>
        </div>
      )}

      {/* App activity */}
      <div>
        <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide mb-2">App activity</p>
        <p className="text-xs text-warmstone-600">
          <span className="font-semibold text-warmstone-900">{report.page_views}</span>
          <span className="text-warmstone-500 ml-1">page views logged</span>
        </p>
      </div>
    </div>
  );
}

function Stat({ v, highlight = false }: { v: number; highlight?: boolean }) {
  if (v === 0) return <td className="px-2 py-2 text-center text-warmstone-300 text-xs">—</td>;
  return (
    <td className={`px-2 py-2 text-center font-semibold text-xs ${highlight ? "text-honey-700" : "text-warmstone-700"}`}>
      {v}
    </td>
  );
}

function UserDetailPanel({
  user,
  onClose,
  onUpdate,
  onDelete,
  onRequestDelete,
}: {
  user: AdminUser;
  onClose: () => void;
  onUpdate: (updated: AdminUser) => void;
  onDelete: (userId: string) => void;
  onRequestDelete: (user: AdminUser) => void;
}) {
  const [tab, setTab] = useState<"overview" | "activity">("overview");
  const [reportData, setReportData] = useState<ActivityReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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

  async function loadReport() {
    setReportLoading(true);
    setReportError(null);
    const res = await fetch(`/api/admin/users/${user.id}/activity`);
    const data = await res.json();
    setReportLoading(false);
    if (!res.ok) {
      setReportError(data.error ?? "Failed to load activity report.");
    } else {
      setReportData(data as ActivityReport);
    }
  }

  function handleTabChange(newTab: "overview" | "activity") {
    setTab(newTab);
    if (newTab === "activity" && !reportData && !reportLoading) {
      loadReport();
    }
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
        <div className="w-full max-w-xl bg-warmstone-white border-l border-warmstone-200 shadow-2xl flex flex-col">
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

          {/* Tabs */}
          <div className="flex border-b border-warmstone-100 shrink-0 px-6">
            {(["overview", "activity"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`py-2.5 px-1 mr-5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t
                    ? "border-honey-400 text-warmstone-900"
                    : "border-transparent text-warmstone-400 hover:text-warmstone-600"
                }`}
              >
                {t === "overview" ? "Overview" : "Activity"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-5 flex flex-col gap-6 overflow-y-auto">
            {tab === "overview" ? (
              <>
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
                    {saving ? "Saving..." : "Save changes"}
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
                    onClick={() => onRequestDelete(user)}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-error border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete user
                  </button>
                </div>
              </>
            ) : (
              <>
                {reportLoading && (
                  <div className="flex items-center justify-center py-16 text-xs text-warmstone-400">
                    Loading activity report...
                  </div>
                )}
                {reportError && (
                  <p className="text-xs text-error bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {reportError}
                  </p>
                )}
                {reportData && <ActivityTab user={user} report={reportData} />}
              </>
            )}
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
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

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

  function handleDeleted(userId: string) {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setTotal((t) => t - 1);
    setDeleteTarget(null);
    setSelectedUser(null);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  return (
    <div>
      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}

      {selectedUser && !deleteTarget && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdate}
          onDelete={handleDeleted}
          onRequestDelete={(u) => { setSelectedUser(null); setDeleteTarget(u); }}
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
                <th className="text-left px-3 py-2 text-xs font-semibold text-warmstone-500">Name</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-warmstone-500">Type</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-warmstone-500 hidden lg:table-cell">Subscription</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-warmstone-500 hidden md:table-cell">Signed up</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-warmstone-500 hidden lg:table-cell">Last login</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-warmstone-500">HH</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-warmstone-500">People</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-warmstone-500 hidden lg:table-cell">AI calls</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-warmstone-500 hidden xl:table-cell">Docs scanned</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-warmstone-500 hidden xl:table-cell">Last AI</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className={loading ? "opacity-50" : undefined}>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="border-b border-warmstone-50 last:border-0 hover:bg-warmstone-50 cursor-pointer"
                >
                  <td className="px-3 py-2">
                    <p className="font-medium text-warmstone-900 truncate max-w-[180px]">{u.full_name}</p>
                    <p className="text-xs text-warmstone-400 truncate max-w-[180px]">{u.email}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${accountTypeBadge[u.account_type] ?? accountTypeBadge.standard}`}>
                      {u.account_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    <SubBadge status={u.subscription_status} daysLeft={u.subscription_days_left} />
                  </td>
                  <td className="px-3 py-2 text-xs text-warmstone-500 hidden md:table-cell whitespace-nowrap">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-3 py-2 text-xs text-warmstone-500 hidden lg:table-cell whitespace-nowrap">
                    {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : <span className="text-warmstone-300">Never</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-warmstone-600 font-medium text-xs">
                    {u.household_count}
                  </td>
                  <td className="px-3 py-2 text-right text-warmstone-600 font-medium text-xs">
                    {u.people_count}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-medium hidden lg:table-cell">
                    {u.ai_count > 0
                      ? <span className="text-honey-700">{u.ai_count}</span>
                      : <span className="text-warmstone-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-medium hidden xl:table-cell">
                    {u.docs_scanned > 0
                      ? <span className="text-honey-700">{u.docs_scanned}</span>
                      : <span className="text-warmstone-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-warmstone-500 hidden xl:table-cell whitespace-nowrap">
                    {u.last_ai_at ? formatDate(u.last_ai_at) : <span className="text-warmstone-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(u);
                      }}
                      title="Delete user"
                      className="p-1.5 rounded-md text-red-400 border border-transparent hover:border-red-200 hover:bg-red-50 hover:text-error transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-warmstone-400">
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
