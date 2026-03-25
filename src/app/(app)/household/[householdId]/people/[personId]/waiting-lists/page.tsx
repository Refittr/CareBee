"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, Clock, RefreshCw, AlertTriangle, CheckCircle,
  AlertCircle, Mail, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateUK } from "@/lib/utils/dates";
import { useAIAccess } from "@/lib/utils/access";
import { trackFeatureUsage } from "@/lib/utils/analytics";
import { useCanEdit } from "@/lib/context/role";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { ScanModal } from "@/components/scan/ScanModal";
import type { WaitingList, WaitStatus } from "@/lib/types/database";

type BadgeVariant = "active" | "warning" | "error" | "neutral";

const statusConfig: Record<WaitStatus, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  within_range: { label: "On track", variant: "active", icon: <CheckCircle size={12} /> },
  approaching_limit: { label: "Getting close", variant: "warning", icon: <AlertCircle size={12} /> },
  overdue: { label: "May be overdue", variant: "error", icon: <AlertTriangle size={12} /> },
  significantly_overdue: { label: "Overdue, consider chasing", variant: "error", icon: <AlertTriangle size={12} /> },
};

function weeksWaiting(referralDate: string): number {
  return Math.floor((Date.now() - new Date(referralDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
}

interface WaitlistForm {
  department: string;
  trust_name: string;
  referred_by: string;
  referral_date: string;
  expected_wait: string;
  notes: string;
}

const emptyForm: WaitlistForm = {
  department: "",
  trust_name: "",
  referred_by: "",
  referral_date: "",
  expected_wait: "",
  notes: "",
};

export default function WaitingListsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useAppToast();

  const { hasAccess } = useAIAccess(householdId);
  const canEdit = useCanEdit();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const [entries, setEntries] = useState<WaitingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WaitingList | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WaitingList | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WaitlistForm>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPastOpen, setShowPastOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("waiting_lists")
      .select("*")
      .eq("person_id", personId)
      .order("referral_date", { ascending: false });
    if (err) setError(err.message);
    else setEntries(data ?? []);
    setLoading(false);
  }, [personId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm(emptyForm);
    setAddOpen(true);
  }

  function openEdit(entry: WaitingList) {
    setForm({
      department: entry.department,
      trust_name: entry.trust_name ?? "",
      referred_by: entry.referred_by ?? "",
      referral_date: entry.referral_date.split("T")[0],
      expected_wait: entry.expected_wait ?? "",
      notes: entry.notes ?? "",
    });
    setEditTarget(entry);
  }

  async function handleSave() {
    if (!form.department.trim() || !form.referral_date) {
      addToast("Department and referral date are required.", "error");
      return;
    }
    setSaving(true);
    const payload = {
      department: form.department.trim(),
      trust_name: form.trust_name.trim() || null,
      referred_by: form.referred_by.trim() || null,
      referral_date: form.referral_date,
      expected_wait: form.expected_wait.trim() || null,
      notes: form.notes.trim() || null,
      person_id: personId,
      household_id: householdId,
    };

    if (editTarget) {
      const { error: err } = await supabase.from("waiting_lists").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editTarget.id);
      if (err) { addToast(err.message, "error"); }
      else {
        void trackFeatureUsage("waiting_lists", "waiting_list_updated", "person", personId);
        addToast("Waiting list entry updated.", "success"); setEditTarget(null); await load();
      }
    } else {
      const { error: err } = await supabase.from("waiting_lists").insert({ ...payload, status: "waiting" });
      if (err) { addToast(err.message, "error"); }
      else {
        void trackFeatureUsage("waiting_lists", "waiting_list_added", "person", personId);
        addToast("Added to waiting list.", "success"); setAddOpen(false); await load();
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("waiting_lists").delete().eq("id", deleteTarget.id);
    if (err) addToast(err.message, "error");
    else { addToast("Entry removed.", "success"); setDeleteTarget(null); await load(); }
    setDeleting(false);
  }

  async function markAsSeen(entry: WaitingList) {
    const { error: err } = await supabase.from("waiting_lists").update({ status: "seen", updated_at: new Date().toISOString() }).eq("id", entry.id);
    if (err) addToast(err.message, "error");
    else { addToast("Marked as seen.", "success"); await load(); }
  }

  async function runEstimate() {
    setEstimating(true);
    try {
      const res = await fetch("/api/waitlist/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, household_id: householdId }),
      });
      if (!res.ok) throw new Error("Estimate failed");
      addToast("Wait times updated.", "success");
      await load();
    } catch {
      addToast("Could not get estimates. Please try again.", "error");
    }
    setEstimating(false);
  }

  function goToChase(entry: WaitingList) {
    router.push(
      `/household/${householdId}/people/${personId}/letters?template=chase_referral&department=${encodeURIComponent(entry.department)}&trust=${encodeURIComponent(entry.trust_name ?? "")}`
    );
  }

  const active = entries.filter((e) => e.status === "waiting");
  const past = entries.filter((e) => e.status !== "waiting");
  const hasOverdue = active.some((e) => e.wait_status === "overdue" || e.wait_status === "significantly_overdue");

  const FormSection = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Department / Specialty *"
          value={form.department}
          onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
          placeholder="e.g. Cardiology"
        />
        <Input
          label="NHS Trust"
          value={form.trust_name}
          onChange={(e) => setForm((f) => ({ ...f, trust_name: e.target.value }))}
          placeholder="e.g. Barts Health NHS Trust"
        />
        <Input
          label="Referred by"
          value={form.referred_by}
          onChange={(e) => setForm((f) => ({ ...f, referred_by: e.target.value }))}
          placeholder="e.g. Dr Smith / GP"
        />
        <Input
          label="Referral date *"
          type="date"
          value={form.referral_date}
          onChange={(e) => setForm((f) => ({ ...f, referral_date: e.target.value }))}
        />
        <Input
          label="Expected wait (from letter)"
          value={form.expected_wait}
          onChange={(e) => setForm((f) => ({ ...f, expected_wait: e.target.value }))}
          placeholder="e.g. 18 weeks"
        />
      </div>
      <Textarea
        label="Notes"
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        placeholder="Any additional context"
        rows={2}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={() => { setAddOpen(false); setEditTarget(null); }}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editTarget ? "Save changes" : "Add to list"}</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-warmstone-900">Waiting lists</h2>
          <p className="text-sm text-warmstone-600">Track NHS referrals and get estimated waiting times</p>
        </div>
        <div className="flex gap-2">
          {active.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => hasAccess === false ? setShowUpgrade(true) : runEstimate()}
              disabled={estimating}
              className="gap-2"
            >
              <Sparkles size={16} />
              {estimating ? "Checking..." : "Check wait times"}
            </Button>
          )}
          {canEdit && (
            <Button variant="secondary" onClick={() => hasAccess === false ? setShowUpgrade(true) : setScanOpen(true)} className="gap-2">
              <Sparkles size={16} />
              Scan with AI
            </Button>
          )}
          {canEdit && (
            <Button onClick={openAdd} className="gap-2">
              <Plus size={16} />
              Add referral
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {hasOverdue && (
        <Alert type="warning">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">One or more waits may be overdue</p>
              <p className="text-sm mt-0.5">Consider chasing the NHS trust or contacting PALS. Use the "Generate chase letter" button on the relevant entry.</p>
            </div>
          </div>
        </Alert>
      )}

      {loading ? (
        <SkeletonLoader count={3} />
      ) : active.length === 0 ? (
        <EmptyState
          icon={Clock}
          heading="No active referrals"
          description="Add referrals from letters or notifications from NHS trusts to track your wait."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((entry) => {
            const weeks = weeksWaiting(entry.referral_date);
            const status = entry.wait_status;
            const isExpanded = expandedId === entry.id;

            return (
              <Card key={entry.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-warmstone-900">{entry.department}</span>
                      {entry.trust_name && (
                        <span className="text-sm text-warmstone-500">{entry.trust_name}</span>
                      )}
                      {status && statusConfig[status] && (
                        <span className={[
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                          status === "within_range" ? "bg-sage-100 text-sage-800" :
                          status === "approaching_limit" ? "bg-honey-100 text-honey-800" :
                          "bg-red-100 text-red-800"
                        ].join(" ")}>
                          {statusConfig[status].icon}
                          {statusConfig[status].label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-warmstone-600 mt-0.5">
                      Referred {formatDateUK(entry.referral_date)}{entry.referred_by ? ` by ${entry.referred_by}` : ""}
                      <span className="mx-1 text-warmstone-300">·</span>
                      Waiting <span className="font-semibold text-warmstone-800">{weeks} weeks</span>
                      {entry.estimated_weeks && (
                        <> (typical: {entry.estimated_weeks} weeks)</>
                      )}
                    </p>

                    {entry.estimate_details && (
                      <p className="text-sm text-warmstone-600 mt-1">{entry.estimate_details}</p>
                    )}

                    {entry.last_estimated_at && (
                      <p className="text-xs text-warmstone-400 mt-1">
                        Last checked: {formatDateUK(entry.last_estimated_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="p-1.5 text-warmstone-400 hover:text-warmstone-700 transition-colors"
                      title="More options"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {(entry.wait_status === "overdue" || entry.wait_status === "significantly_overdue") && entry.action_suggestion && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900">Action recommended</p>
                      <p className="text-sm text-red-800 mt-0.5">{entry.action_suggestion}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => goToChase(entry)}
                      className="gap-1.5 shrink-0"
                    >
                      <Mail size={14} />
                      Generate chase letter
                    </Button>
                  </div>
                )}

                {isExpanded && (
                  <div className="border-t border-warmstone-100 pt-3 flex flex-col gap-2">
                    {entry.notes && (
                      <p className="text-sm text-warmstone-600"><span className="font-medium">Notes:</span> {entry.notes}</p>
                    )}
                    {entry.expected_wait && (
                      <p className="text-sm text-warmstone-600"><span className="font-medium">Expected wait from letter:</span> {entry.expected_wait}</p>
                    )}
                    <div className="flex gap-2 flex-wrap mt-1">
                      {canEdit && (
                        <Button size="sm" variant="secondary" onClick={() => openEdit(entry)} className="gap-1.5">
                          <Pencil size={14} /> Edit
                        </Button>
                      )}
                      {canEdit && (
                        <Button size="sm" variant="secondary" onClick={() => markAsSeen(entry)} className="gap-1.5">
                          <CheckCircle size={14} /> Mark as seen
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => goToChase(entry)} className="gap-1.5">
                        <Mail size={14} /> Chase letter
                      </Button>
                      {canEdit && (
                        <Button size="sm" variant="secondary" onClick={() => setDeleteTarget(entry)} className="gap-1.5 text-red-600 hover:text-red-700">
                          <Trash2 size={14} /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPastOpen(!showPastOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-warmstone-600 hover:text-warmstone-900 transition-colors mb-3"
          >
            {showPastOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Past referrals ({past.length})
          </button>
          {showPastOpen && (
            <div className="flex flex-col gap-2">
              {past.map((entry) => (
                <Card key={entry.id} className="flex items-center justify-between gap-3 py-3 opacity-70">
                  <div>
                    <span className="font-semibold text-warmstone-800">{entry.department}</span>
                    {entry.trust_name && <span className="text-sm text-warmstone-500 ml-2">{entry.trust_name}</span>}
                    <p className="text-sm text-warmstone-500">
                      Referred {formatDateUK(entry.referral_date)} · {entry.status === "seen" ? "Seen" : entry.status === "cancelled" ? "Cancelled" : "Appointment received"}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setDeleteTarget(entry)}
                      className="p-1.5 text-warmstone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add referral"
      >
        {FormSection}
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit referral"
      >
        {FormSection}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove entry"
        description={`Remove the referral to ${deleteTarget?.department}? This cannot be undone.`}
        confirmLabel="Remove"
        loading={deleting}
      />

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <ScanModal
        open={scanOpen}
        onClose={() => { setScanOpen(false); load(); }}
        householdId={householdId}
        personId={personId}
      />
    </div>
  );
}
