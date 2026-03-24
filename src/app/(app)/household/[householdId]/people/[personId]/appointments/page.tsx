"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, Calendar, ClipboardList, CheckCircle,
  RefreshCw, Share2, Download, X, ChevronDown, ChevronUp, Sparkles,
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
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateTime, formatDateUK } from "@/lib/utils/dates";
import { useAIAccess } from "@/lib/utils/access";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { ScanModal } from "@/components/scan/ScanModal";
import type { Appointment } from "@/lib/types/database";

type BadgeVariant = "info" | "active" | "neutral" | "error";
const statusConfig: Record<Appointment["status"], { label: string; variant: BadgeVariant }> = {
  upcoming: { label: "Upcoming", variant: "info" },
  completed: { label: "Completed", variant: "active" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  missed: { label: "Missed", variant: "error" },
};

interface PrepRecord { id: string; content: string; generated_at: string }
interface DebriefRecord {
  id: string;
  appointment_id: string;
  summary: string | null;
  medication_changes: boolean;
  medication_change_details: string | null;
  new_referrals: boolean;
  new_referral_details: string | null;
  tests_ordered: boolean;
  test_details: string | null;
  next_appointment: string | null;
  concerns: string | null;
  suggested_updates: Record<string, unknown>[];
  status: string;
}
interface SuggestedUpdate { type: string; description: string; data: Record<string, unknown> }

function openPrintWindow(title: string, content: string) {
  const lines = content.split("\n").map((l) =>
    l.trim() === "" ? "<br/>" : `<p style="margin:0 0 6px 0">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
  ).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;margin:2cm;color:#111}h2{font-size:14pt;color:#333;margin-top:20px}@media print{body{margin:2cm}}</style></head><body>${lines}</body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to print."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ---- Prep Modal ------------------------------------------------------------
function PrepModal({ appt, householdId, personId, onClose }: {
  appt: Appointment; householdId: string; personId: string; onClose: () => void;
}) {
  const { addToast } = useAppToast();
  const [prep, setPrep] = useState<PrepRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/appointments/prep?appointment_id=${appt.id}`)
      .then((r) => r.json())
      .then((d) => { setPrep(d.prep ?? null); setLoading(false); });
  }, [appt.id]);

  async function generate() {
    setGenerating(true); setError(null);
    try {
      const res = await fetch("/api/appointments/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appt.id, person_id: personId, household_id: householdId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not generate prep."); return; }
      setPrep(data.prep);
    } catch { setError("Could not reach the server."); }
    finally { setGenerating(false); }
  }

  function share() {
    if (!prep) return;
    const text = `${appt.title} - Appointment Prep\n\n${prep.content}`;
    if (navigator.share) {
      navigator.share({ title: `Appointment prep: ${appt.title}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => addToast("Copied to clipboard.", "success"));
    }
  }

  return (
    <Modal open onClose={onClose} title={`Prepare: ${appt.title}`} maxWidth="lg">
      {loading ? (
        <SkeletonLoader variant="card" count={3} />
      ) : error ? (
        <Alert type="error" description={error} />
      ) : !prep ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <ClipboardList size={40} className="text-warmstone-200" />
          <div>
            <p className="font-semibold text-warmstone-800">No prep brief yet</p>
            <p className="text-sm text-warmstone-500 mt-1">Generate a personalised prep brief based on this person&apos;s record.</p>
          </div>
          <Button onClick={generate} loading={generating}>
            <Sparkles size={16} /> Generate prep brief
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={share} className="flex items-center gap-1.5 text-sm font-semibold text-warmstone-700 bg-warmstone-100 hover:bg-warmstone-200 px-3 py-2 rounded-md min-h-[40px] transition-colors">
              <Share2 size={14} /> Share
            </button>
            <button onClick={() => openPrintWindow(`${appt.title} - Prep Brief`, prep.content)} className="flex items-center gap-1.5 text-sm font-semibold text-warmstone-700 bg-warmstone-100 hover:bg-warmstone-200 px-3 py-2 rounded-md min-h-[40px] transition-colors">
              <Download size={14} /> Print / PDF
            </button>
            <button onClick={generate} disabled={generating} className="flex items-center gap-1.5 text-sm text-warmstone-500 hover:text-warmstone-800 px-3 py-2 rounded-md min-h-[40px] transition-colors disabled:opacity-60">
              <RefreshCw size={14} className={generating ? "animate-spin" : ""} /> Regenerate
            </button>
          </div>
          <p className="text-xs text-warmstone-400">Generated {formatDateUK(prep.generated_at)}</p>
          <div className="whitespace-pre-wrap text-sm text-warmstone-800 leading-relaxed bg-warmstone-50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
            {prep.content}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---- Debrief Modal ---------------------------------------------------------
function DebriefModal({ appt, householdId, personId, existing, onClose, onSaved }: {
  appt: Appointment; householdId: string; personId: string;
  existing: DebriefRecord | null; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const { addToast } = useAppToast();
  const [form, setForm] = useState({
    summary: existing?.summary ?? "",
    medication_changes: existing?.medication_changes ?? false,
    medication_change_details: existing?.medication_change_details ?? "",
    new_referrals: existing?.new_referrals ?? false,
    new_referral_details: existing?.new_referral_details ?? "",
    tests_ordered: existing?.tests_ordered ?? false,
    test_details: existing?.test_details ?? "",
    next_appointment: existing?.next_appointment ?? "",
    concerns: existing?.concerns ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [savedDebrief, setSavedDebrief] = useState<DebriefRecord | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedUpdate[]>([]);
  const [missingPrompts, setMissingPrompts] = useState<{ field: string; prompt: string }[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());

  function set(key: string, val: unknown) { setForm((f) => ({ ...f, [key]: val })); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/appointments/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appt.id, person_id: personId, household_id: householdId,
          debrief: { ...form, medication_changes: form.medication_changes, new_referrals: form.new_referrals, tests_ordered: form.tests_ordered },
        }),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error ?? "Could not save.", "error"); return; }
      setSavedDebrief(data.debrief);
      setSuggestions(data.suggested_updates ?? []);
      setMissingPrompts(data.missing_info_prompts ?? []);
      // Mark appointment as completed if still upcoming
      if (appt.status === "upcoming") {
        await supabase.from("appointments").update({ status: "completed" }).eq("id", appt.id);
      }
      addToast("Debrief saved.", "success");
    } catch { addToast("Could not save. Please try again.", "error"); }
    finally { setSaving(false); }
  }

  async function applySuggestion(s: SuggestedUpdate, idx: number) {
    setApplying(`${idx}`);
    const d = s.data;
    const today = new Date().toISOString().split("T")[0];
    try {
      if (s.type === "add_medication") {
        await supabase.from("medications").insert({ person_id: personId, household_id: householdId, name: String(d.name ?? ""), dosage: String(d.dose ?? ""), frequency: String(d.frequency ?? ""), purpose: String(d.reason ?? ""), prescribed_by: d.prescribed_by ? String(d.prescribed_by) : null, start_date: today, is_active: true });
      } else if (s.type === "stop_medication") {
        await supabase.from("medications").update({ is_active: false, end_date: today }).eq("person_id", personId).ilike("name", `%${String(d.name ?? "")}%`);
      } else if (s.type === "add_referral") {
        await supabase.from("waiting_lists").insert({ person_id: personId, household_id: householdId, department: String(d.department ?? ""), referred_by: d.referred_by ? String(d.referred_by) : null, referral_date: today, expected_wait: d.expected_wait ? String(d.expected_wait) : null, status: "waiting" });
      } else if (s.type === "add_appointment") {
        await supabase.from("appointments").insert({ person_id: personId, household_id: householdId, title: String(d.department ?? "Follow-up appointment"), appointment_date: d.date ? String(d.date) + "T09:00:00" : today + "T09:00:00", status: "upcoming", notes_before: d.notes ? String(d.notes) : null });
      } else if (s.type === "add_condition") {
        await supabase.from("conditions").insert({ person_id: personId, household_id: householdId, name: String(d.name ?? ""), date_diagnosed: d.date_diagnosed ? String(d.date_diagnosed) : null, diagnosed_by: d.diagnosed_by ? String(d.diagnosed_by) : null, is_active: true });
      }
      setDismissedSuggestions((prev) => new Set([...prev, idx]));
      addToast("Record updated.", "success");
    } catch { addToast("Could not apply update.", "error"); }
    finally { setApplying(null); }
  }

  const showSuggestions = savedDebrief && (suggestions.length > 0 || missingPrompts.length > 0);

  return (
    <Modal open onClose={onClose} title={`Debrief: ${appt.title}`} maxWidth="lg">
      {showSuggestions ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-warmstone-600">Debrief saved. Based on what you wrote, here are some suggested record updates:</p>
          {missingPrompts.map((p, i) => (
            <div key={i} className="bg-honey-50 border border-honey-200 rounded-lg p-4 text-sm text-honey-900">{p.prompt}</div>
          ))}
          {suggestions.map((s, i) => !dismissedSuggestions.has(i) && (
            <Card key={i} className="p-4 flex items-start justify-between gap-4">
              <p className="text-sm text-warmstone-800 flex-1">{s.description}</p>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" loading={applying === `${i}`} onClick={() => applySuggestion(s, i)}>Add to record</Button>
                <button onClick={() => setDismissedSuggestions((p) => new Set([...p, i]))} className="text-sm text-warmstone-400 hover:text-warmstone-800 px-2 min-h-[36px]">Skip</button>
              </div>
            </Card>
          ))}
          <Button onClick={() => { onSaved(); onClose(); }}>Done</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Textarea label="What was discussed?" placeholder="What did the doctor say? What was the main outcome?" rows={4} value={form.summary} onChange={(e) => set("summary", e.target.value)} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-warmstone-800">Were any medications changed?</p>
              <button onClick={() => set("medication_changes", !form.medication_changes)} className={`w-12 h-6 rounded-full transition-colors ${form.medication_changes ? "bg-honey-400" : "bg-warmstone-200"}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.medication_changes ? "translate-x-6" : ""}`} />
              </button>
            </div>
            {form.medication_changes && <Textarea placeholder="What was changed? New medication, dose adjusted, medication stopped?" rows={2} value={form.medication_change_details} onChange={(e) => set("medication_change_details", e.target.value)} />}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-warmstone-800">Were any new referrals made?</p>
              <button onClick={() => set("new_referrals", !form.new_referrals)} className={`w-12 h-6 rounded-full transition-colors ${form.new_referrals ? "bg-honey-400" : "bg-warmstone-200"}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.new_referrals ? "translate-x-6" : ""}`} />
              </button>
            </div>
            {form.new_referrals && <Textarea placeholder="Referred to which department? Any expected wait time mentioned?" rows={2} value={form.new_referral_details} onChange={(e) => set("new_referral_details", e.target.value)} />}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-warmstone-800">Were any tests or scans ordered?</p>
              <button onClick={() => set("tests_ordered", !form.tests_ordered)} className={`w-12 h-6 rounded-full transition-colors ${form.tests_ordered ? "bg-honey-400" : "bg-warmstone-200"}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.tests_ordered ? "translate-x-6" : ""}`} />
              </button>
            </div>
            {form.tests_ordered && <Textarea placeholder="What tests? Blood tests, scans, other? When are they booked for?" rows={2} value={form.test_details} onChange={(e) => set("test_details", e.target.value)} />}
          </div>

          <Input label="Next appointment?" placeholder="When is the next appointment? Or is one being sent in the post?" value={form.next_appointment} onChange={(e) => set("next_appointment", e.target.value)} />
          <Textarea label="Anything you are worried about?" placeholder="Any concerns after the appointment? Anything to follow up on?" rows={3} value={form.concerns} onChange={(e) => set("concerns", e.target.value)} />

          <div className="flex gap-3">
            <Button onClick={save} loading={saving}>Save debrief</Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---- Main page -------------------------------------------------------------
export default function AppointmentsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();
  const router = useRouter();

  const { hasAccess } = useAIAccess();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prepIds, setPrepIds] = useState<Record<string, boolean>>({});
  const [debriefs, setDebriefs] = useState<Record<string, DebriefRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [prepTarget, setPrepTarget] = useState<Appointment | null>(null);
  const [debriefTarget, setDebriefTarget] = useState<Appointment | null>(null);
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("appointments").select("*").eq("person_id", personId).order("appointment_date");
    if (err) { setError(err.message); setLoading(false); return; }
    setAppointments(data ?? []);

    if (data && data.length > 0) {
      const ids = data.map((a) => a.id);
      const [{ data: preps }, { data: dbs }] = await Promise.all([
        supabase.from("appointment_preps").select("appointment_id").in("appointment_id", ids),
        supabase.from("appointment_debriefs").select("*").in("appointment_id", ids),
      ]);
      const prepMap: Record<string, boolean> = {};
      (preps ?? []).forEach((p) => { prepMap[p.appointment_id] = true; });
      const debriefMap: Record<string, DebriefRecord> = {};
      (dbs ?? []).forEach((d) => { debriefMap[d.appointment_id] = d as DebriefRecord; });
      setPrepIds(prepMap);
      setDebriefs(debriefMap);
    }
    setLoading(false);
  }, [personId, supabase]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("appointments").delete().eq("id", deleteTarget.id);
    if (err) addToast("Something went wrong. Please try again.", "error");
    else { addToast("Appointment removed.", "success"); setDeleteTarget(null); load(); }
    setDeleting(false);
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load appointments" description={error} />;

  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const upcoming = appointments.filter((a) => a.status === "upcoming" && a.appointment_date >= now.toISOString());
  const past = appointments.filter((a) => a.status !== "upcoming" || a.appointment_date < now.toISOString()).reverse().slice(0, 15);

  // Appointments needing debrief: past within 48 hours, not already debriefed, not dismissed
  const needsDebrief = appointments.filter(
    (a) => a.appointment_date >= fortyEightHoursAgo && a.appointment_date < now.toISOString() && !debriefs[a.id] && !dismissedPrompts.has(a.id)
  );

  function AppointmentCard({ appt }: { appt: Appointment }) {
    const { label, variant } = statusConfig[appt.status];
    const hasPrep = prepIds[appt.id];
    const hasDebrief = !!debriefs[appt.id];
    const debrief = debriefs[appt.id];
    const isUpcoming = appt.status === "upcoming" && appt.appointment_date >= now.toISOString();
    const [showDebrief, setShowDebrief] = useState(false);

    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-warmstone-900">{appt.title}</h3>
              <Badge variant={variant}>{label}</Badge>
              {hasDebrief && <CheckCircle size={15} className="text-sage-500" aria-label="Debrief recorded" />}
            </div>
            <p className="text-sm text-warmstone-600">{formatDateTime(appt.appointment_date)}</p>
            {appt.location && <p className="text-sm text-warmstone-400">{appt.location}{appt.department ? `, ${appt.department}` : ""}</p>}
            {appt.professional_name && <p className="text-sm text-warmstone-400">{appt.professional_name}</p>}

            {/* Prep button for upcoming */}
            {isUpcoming && (
              <button
                onClick={() => hasAccess === false && !hasPrep ? setShowUpgrade(true) : setPrepTarget(appt)}
                className={`mt-3 flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-md min-h-[36px] transition-colors ${hasPrep ? "text-sage-700 bg-sage-50 hover:bg-sage-100" : "text-honey-800 bg-honey-50 hover:bg-honey-100"}`}
              >
                <ClipboardList size={14} />
                {hasPrep ? "View prep" : "Prepare for this appointment"}
              </button>
            )}

            {/* Debrief for past */}
            {!isUpcoming && (
              hasDebrief ? (
                <div className="mt-3">
                  <button onClick={() => setShowDebrief((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-sage-700 hover:text-sage-900 min-h-[36px]">
                    {showDebrief ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    View debrief
                  </button>
                  {showDebrief && debrief && (
                    <div className="mt-2 flex flex-col gap-1 text-sm border-l-2 border-sage-200 pl-3">
                      {debrief.summary && <p className="text-warmstone-700"><span className="font-semibold">Summary:</span> {debrief.summary}</p>}
                      {debrief.medication_changes && debrief.medication_change_details && <p className="text-warmstone-700"><span className="font-semibold">Medication changes:</span> {debrief.medication_change_details}</p>}
                      {debrief.new_referrals && debrief.new_referral_details && <p className="text-warmstone-700"><span className="font-semibold">New referrals:</span> {debrief.new_referral_details}</p>}
                      {debrief.next_appointment && <p className="text-warmstone-700"><span className="font-semibold">Next appointment:</span> {debrief.next_appointment}</p>}
                      {debrief.concerns && <p className="text-warmstone-700"><span className="font-semibold">Concerns:</span> {debrief.concerns}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => hasAccess === false ? setShowUpgrade(true) : setDebriefTarget(appt)} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-honey-800 bg-honey-50 hover:bg-honey-100 px-3 py-1.5 rounded-md min-h-[36px] transition-colors">
                  <Sparkles size={13} /> Record debrief
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditTarget(appt)} className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Pencil size={16} /></button>
            <button onClick={() => setDeleteTarget(appt)} className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={16} /></button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Debrief prompt banners */}
      {needsDebrief.map((appt) => (
        <div key={appt.id} className="bg-honey-50 border border-honey-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-honey-900 font-semibold">
            {appt.title} was on {formatDateUK(appt.appointment_date)}. How did it go?
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => hasAccess === false ? setShowUpgrade(true) : setDebriefTarget(appt)}>Debrief now</Button>
            <button onClick={() => setDismissedPrompts((p) => new Set([...p, appt.id]))} className="text-warmstone-400 hover:text-warmstone-800 min-h-[36px] min-w-[36px] flex items-center justify-center"><X size={16} /></button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-warmstone-900">Appointments</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => hasAccess === false ? setShowUpgrade(true) : setScanOpen(true)}>
            <Sparkles size={16} /> Scan with AI
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add</Button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <EmptyState icon={Calendar} heading="No appointments recorded" description="Keep track of every appointment across all hospitals and services." ctaLabel="Add an appointment" onCta={() => setAddOpen(true)} />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-warmstone-600 mb-3 uppercase tracking-wide">Upcoming</h3>
              <div className="flex flex-col gap-3">{upcoming.map((a) => <AppointmentCard key={a.id} appt={a} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-warmstone-600 mb-3 uppercase tracking-wide">Past</h3>
              <div className="flex flex-col gap-3">{past.map((a) => <AppointmentCard key={a.id} appt={a} />)}</div>
            </div>
          )}
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add an appointment" maxWidth="lg">
        <AppointmentForm householdId={householdId} personId={personId} onSaved={() => { setAddOpen(false); load(); }} onCancel={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit appointment" maxWidth="lg">
        {editTarget && <AppointmentForm householdId={householdId} personId={personId} appointment={editTarget} onSaved={() => { setEditTarget(null); load(); }} onCancel={() => setEditTarget(null)} />}
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove appointment" description={`Are you sure you want to remove "${deleteTarget?.title}"?`} loading={deleting} />
      {prepTarget && <PrepModal appt={prepTarget} householdId={householdId} personId={personId} onClose={() => { setPrepTarget(null); load(); }} />}
      {debriefTarget && <DebriefModal appt={debriefTarget} householdId={householdId} personId={personId} existing={debriefs[debriefTarget.id] ?? null} onClose={() => setDebriefTarget(null)} onSaved={() => { setDebriefTarget(null); load(); }} />}
      <ScanModal open={scanOpen} onClose={() => { setScanOpen(false); void load(); }} householdId={householdId} personId={personId} />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
