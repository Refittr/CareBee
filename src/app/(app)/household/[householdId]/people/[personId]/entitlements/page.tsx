"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PoundSterling, RefreshCw, ChevronDown, ChevronUp, CheckCircle, X,
  FileText, Info, AlertTriangle, Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateUK } from "@/lib/utils/dates";
import type { Entitlement, EntitlementCurrentStatus } from "@/lib/types/database";

const CATEGORY_LABELS: Record<string, string> = {
  disability_benefit: "Disability benefit",
  carer_benefit: "Carer benefit",
  financial_support: "Financial support",
  practical_support: "Practical support",
  health_exemption: "Health exemption",
  housing: "Housing",
  tax_relief: "Tax relief",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  application_in_progress: "Applying",
  submitted: "Submitted",
  awarded: "Awarded",
  rejected: "Rejected",
  under_review: "Under review",
};

const CARE_NEEDS_QUESTIONS = [
  { key: "lives_alone", label: "Does this person live alone?", type: "select", options: ["yes", "no"] },
  { key: "housing_tenure", label: "Do they rent or own their home?", type: "select", options: ["own", "rent", "council_tenant", "housing_association"] },
  { key: "other_income", label: "Do they receive any income apart from state pension?", type: "select", options: ["yes", "no"] },
  { key: "savings_above_10k", label: "Do they have savings above £10,000?", type: "select", options: ["yes", "no"] },
  { key: "help_during_day", label: "Do they need help during the day?", type: "select", options: ["never", "sometimes", "often", "always"] },
  { key: "help_during_night", label: "Do they need help during the night?", type: "select", options: ["never", "sometimes", "often", "always"] },
  { key: "mobility_outdoors", label: "Can they walk outdoors without help?", type: "select", options: ["yes", "with_difficulty", "only_short_distances", "no"] },
  { key: "prepare_meal", label: "Can they prepare a meal for themselves?", type: "select", options: ["yes", "with_difficulty", "no"] },
  { key: "wash_and_dress", label: "Can they wash and dress themselves?", type: "select", options: ["yes", "with_some_help", "no"] },
  { key: "supervision_needed", label: "Do they need supervision due to cognitive issues or risk of falling?", type: "select", options: ["never", "sometimes", "often", "always"] },
  { key: "terminally_ill", label: "Are they terminally ill?", type: "select", options: ["yes", "no"] },
] as const;

const OPTION_LABELS: Record<string, string> = {
  yes: "Yes", no: "No",
  own: "Own", rent: "Rent (private)", council_tenant: "Council tenant", housing_association: "Housing association",
  never: "Never", sometimes: "Sometimes", often: "Often", always: "Always",
  with_difficulty: "With difficulty", only_short_distances: "Only short distances",
  with_some_help: "With some help",
};


export default function EntitlementsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [personName, setPersonName] = useState("");
  const [careNeeds, setCareNeeds] = useState<Record<string, string>>({});
  const [savingNeeds, setSavingNeeds] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireDraft, setQuestionnaireDraft] = useState<Record<string, string>>({});
  const [showAlreadyClaiming, setShowAlreadyClaiming] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [dismissTarget, setDismissTarget] = useState<Entitlement | null>(null);
  const [claimingTarget, setClaimingTarget] = useState<Entitlement | null>(null);
  const [claimingForm, setClaimingForm] = useState({ award_amount: "", review_date: "" });
  const [statusTarget, setStatusTarget] = useState<Entitlement | null>(null);
  const [statusValue, setStatusValue] = useState<EntitlementCurrentStatus>("not_started");
  const [canEdit, setCanEdit] = useState(false);

  const load = useCallback(async () => {
    const [{ data: ents }, { data: person }, { data: membership }] = await Promise.all([
      supabase.from("entitlements").select("*").eq("person_id", personId).order("created_at", { ascending: false }),
      supabase.from("people").select("first_name, last_name, care_needs_assessment").eq("id", personId).single(),
      supabase.from("household_members").select("role").eq("household_id", householdId).maybeSingle(),
    ]);
    setEntitlements(ents ?? []);
    if (person) {
      setPersonName(`${person.first_name} ${person.last_name}`);
      const cna = (person.care_needs_assessment ?? {}) as Record<string, string>;
      setCareNeeds(cna);
      setQuestionnaireDraft(cna);
      const hasAnswers = Object.keys(cna).length > 0;
      setShowQuestionnaire(!hasAnswers);
    }
    if (membership) setCanEdit(membership.role === "owner" || membership.role === "editor");
    if ((ents ?? []).length > 0) {
      const latest = (ents ?? []).reduce((a, b) => a.last_checked_at > b.last_checked_at ? a : b);
      setLastChecked(latest.last_checked_at);
    }
  }, [personId, householdId, supabase]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function runCheck() {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/entitlements/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, household_id: householdId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Check failed."); return; }
      setEntitlements(data.entitlements ?? []);
      setLastChecked(data.checked_at);
      addToast("Eligibility check complete.", "success");
    } catch {
      setError("Could not run eligibility check. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function saveQuestionnaire() {
    setSavingNeeds(true);
    const { error: err } = await supabase.from("people").update({ care_needs_assessment: questionnaireDraft }).eq("id", personId);
    if (err) { addToast("Could not save. Please try again.", "error"); }
    else {
      setCareNeeds(questionnaireDraft);
      setShowQuestionnaire(false);
      addToast("Saved. Running eligibility check...", "success");
      await runCheck();
    }
    setSavingNeeds(false);
  }

  async function dismiss(e: Entitlement) {
    await supabase.from("entitlements").update({ is_dismissed: true, updated_at: new Date().toISOString() }).eq("id", e.id);
    setEntitlements((prev) => prev.map((x) => x.id === e.id ? { ...x, is_dismissed: true } : x));
    setDismissTarget(null);
  }

  async function markClaiming() {
    if (!claimingTarget) return;
    await supabase.from("entitlements").update({
      eligibility_status: "already_claiming",
      current_status: "awarded",
      award_amount: claimingForm.award_amount || null,
      review_date: claimingForm.review_date || null,
      updated_at: new Date().toISOString(),
    }).eq("id", claimingTarget.id);
    setEntitlements((prev) => prev.map((x) => x.id === claimingTarget.id
      ? { ...x, eligibility_status: "already_claiming", current_status: "awarded", award_amount: claimingForm.award_amount || null, review_date: claimingForm.review_date || null }
      : x
    ));
    setClaimingTarget(null);
    setClaimingForm({ award_amount: "", review_date: "" });
  }

  async function updateStatus() {
    if (!statusTarget) return;
    await supabase.from("entitlements").update({ current_status: statusValue, updated_at: new Date().toISOString() }).eq("id", statusTarget.id);
    setEntitlements((prev) => prev.map((x) => x.id === statusTarget.id ? { ...x, current_status: statusValue } : x));
    setStatusTarget(null);
  }

  function toggleCard(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function helpMeApply(e: Entitlement) {
    const templateMap: Record<string, string> = {
      "Attendance Allowance": "attendance_allowance",
      "Personal Independence Payment": "pip_statement",
      "PIP": "pip_statement",
      "Carer's Allowance": "carers_allowance",
      "Blue Badge": "blue_badge",
      "Council Tax Reduction": "council_tax_reduction",
      "Disabled Facilities Grant": "disabled_facilities_grant",
      "NHS Continuing Healthcare": "nhs_continuing_healthcare",
    };
    const template = Object.entries(templateMap).find(([k]) =>
      e.benefit_name.toLowerCase().includes(k.toLowerCase())
    )?.[1] ?? "custom";
    const params = new URLSearchParams({ template, entitlement_id: e.id });
    router.push(`/household/${householdId}/people/${personId}/letters?${params.toString()}`);
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;

  const active = entitlements.filter((e) => !e.is_dismissed && e.eligibility_status !== "already_claiming");
  const likelyEligible = active.filter((e) => e.eligibility_status === "likely_eligible");
  const possiblyEligible = active.filter((e) => e.eligibility_status === "possibly_eligible");
  const alreadyClaiming = entitlements.filter((e) => e.eligibility_status === "already_claiming");
  const dismissed = entitlements.filter((e) => e.is_dismissed);

  function EntitlementCard({ e }: { e: Entitlement }) {
    const expanded = expandedCards.has(e.id);
    const isWithinEightWeeks = e.review_date
      ? (new Date(e.review_date).getTime() - Date.now()) < 8 * 7 * 24 * 60 * 60 * 1000
      : false;
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-warmstone-900">{e.benefit_name}</h3>
              <Badge variant={e.confidence === "high" ? "active" : e.confidence === "medium" ? "warning" : "neutral"}>
                {e.confidence === "high" ? "High confidence" : e.confidence === "medium" ? "Medium confidence" : "Low confidence"}
              </Badge>
              <span className="text-xs bg-warmstone-50 text-warmstone-600 px-2 py-0.5 rounded-full">
                {CATEGORY_LABELS[e.benefit_category] ?? e.benefit_category}
              </span>
            </div>
            {e.estimated_annual_value && (
              <p className="text-sm font-bold text-honey-700">Worth up to {e.estimated_annual_value}/year</p>
            )}
            {e.award_amount && (
              <p className="text-sm font-semibold text-sage-700">Awarded: {e.award_amount}</p>
            )}
            {e.review_date && (
              <p className={`text-xs flex items-center gap-1 mt-0.5 ${isWithinEightWeeks ? "text-error font-semibold" : "text-warmstone-500"}`}>
                {isWithinEightWeeks && <AlertTriangle size={12} />}
                Review due: {formatDateUK(e.review_date)}
              </p>
            )}
          </div>
          <button onClick={() => toggleCard(e.id)} className="shrink-0 p-1 text-warmstone-400 hover:text-warmstone-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {expanded && (
          <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-warmstone-100">
            <div>
              <p className="text-xs font-bold text-warmstone-600 uppercase tracking-wide mb-1">What it is</p>
              <p className="text-sm text-warmstone-700">{e.what_it_is}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-warmstone-600 uppercase tracking-wide mb-1">Why you may qualify</p>
              <p className="text-sm text-warmstone-700">{e.reasoning}</p>
            </div>
            {(e.key_criteria ?? []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-warmstone-600 uppercase tracking-wide mb-1">Criteria you meet</p>
                <ul className="flex flex-col gap-0.5">
                  {(e.key_criteria ?? []).map((c, i) => (
                    <li key={i} className="text-sm text-warmstone-700 flex items-start gap-1.5">
                      <CheckCircle size={12} className="text-sage-500 shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {e.how_to_apply && (
              <div>
                <p className="text-xs font-bold text-warmstone-600 uppercase tracking-wide mb-1">How to apply</p>
                <p className="text-sm text-warmstone-700">{e.how_to_apply}</p>
              </div>
            )}
            {(e.missing_info ?? []).length > 0 && (
              <div className="bg-warmstone-50 rounded-lg p-3 flex items-start gap-2">
                <Info size={14} className="text-warmstone-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-warmstone-700 mb-1">We could give a more accurate result if you add:</p>
                  <ul className="flex flex-col gap-0.5">
                    {(e.missing_info ?? []).map((m, i) => <li key={i} className="text-xs text-warmstone-600">{m}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {e.current_status !== "not_started" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-warmstone-500">Status:</span>
                <span className="text-xs font-semibold text-warmstone-800">{STATUS_LABELS[e.current_status] ?? e.current_status}</span>
                {canEdit && (
                  <button onClick={() => { setStatusTarget(e); setStatusValue(e.current_status); }}
                    className="text-xs text-honey-700 hover:text-honey-900 min-h-[36px] flex items-center gap-1">
                    <Pencil size={11} /> Update
                  </button>
                )}
              </div>
            )}
            {canEdit && e.eligibility_status !== "already_claiming" && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" onClick={() => helpMeApply(e)}>
                  <FileText size={14} /> Help me apply
                </Button>
                <button onClick={() => { setClaimingTarget(e); setClaimingForm({ award_amount: "", review_date: "" }); }}
                  className="text-sm font-semibold text-sage-700 hover:text-sage-900 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-md min-h-[36px] flex items-center gap-1.5">
                  <CheckCircle size={14} /> I already claim this
                </button>
                <button onClick={() => setDismissTarget(e)}
                  className="text-sm text-warmstone-500 hover:text-warmstone-800 bg-warmstone-50 hover:bg-warmstone-100 px-3 py-1.5 rounded-md min-h-[36px] flex items-center gap-1.5">
                  <X size={14} /> Not interested
                </button>
              </div>
            )}
            {canEdit && e.eligibility_status === "already_claiming" && (
              <button onClick={() => { setClaimingTarget(e); setClaimingForm({ award_amount: e.award_amount ?? "", review_date: e.review_date ?? "" }); }}
                className="text-sm font-semibold text-warmstone-600 hover:text-warmstone-900 min-h-[36px] flex items-center gap-1.5 self-start">
                <Pencil size={14} /> Edit award details
              </button>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-warmstone-900 text-lg">Entitlements</h2>
          {lastChecked && (
            <p className="text-xs text-warmstone-400 mt-0.5">Last checked: {formatDateUK(lastChecked)}</p>
          )}
        </div>
        <Button size="sm" variant="ghost" loading={checking} onClick={runCheck}>
          <RefreshCw size={14} /> Check eligibility
        </Button>
      </div>

      {error && <Alert type="error" description={error} />}

      {/* Care needs questionnaire */}
      {(showQuestionnaire || Object.keys(careNeeds).length === 0) && canEdit && (
        <Card className="p-5 border-l-4 border-l-sage-400">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-warmstone-900 mb-1">Help us check eligibility</h3>
              <p className="text-sm text-warmstone-600">
                Answering these questions helps us check what support {personName ? `${personName.split(" ")[0]}` : "this person"} might be entitled to.
                All answers are stored securely in your record and are never shared.
              </p>
            </div>
            {Object.keys(careNeeds).length > 0 && (
              <button onClick={() => setShowQuestionnaire(false)} className="text-warmstone-400 hover:text-warmstone-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {CARE_NEEDS_QUESTIONS.map((q) => (
              <Select
                key={q.key}
                label={q.label}
                value={questionnaireDraft[q.key] ?? ""}
                onChange={(e) => setQuestionnaireDraft((d) => ({ ...d, [q.key]: e.target.value }))}
              >
                <option value="">Select...</option>
                {q.options.map((o) => (
                  <option key={o} value={o}>{OPTION_LABELS[o] ?? o}</option>
                ))}
              </Select>
            ))}
          </div>
          <Button loading={savingNeeds} onClick={saveQuestionnaire}>
            Save and check eligibility
          </Button>
        </Card>
      )}

      {Object.keys(careNeeds).length > 0 && !showQuestionnaire && canEdit && (
        <button
          onClick={() => setShowQuestionnaire(true)}
          className="text-sm text-warmstone-500 hover:text-warmstone-800 self-start min-h-[36px] flex items-center gap-1.5"
        >
          <Pencil size={14} /> Update care needs answers
        </button>
      )}

      {/* Checking state */}
      {checking && (
        <div className="bg-honey-50 border border-honey-200 rounded-lg p-4 flex items-center gap-3">
          <RefreshCw size={16} className="text-honey-800 animate-spin" />
          <p className="text-sm text-honey-800">Checking eligibility for {personName || "this person"}...</p>
        </div>
      )}

      {/* Empty state */}
      {!checking && entitlements.length === 0 && (
        <EmptyState
          icon={PoundSterling}
          heading="No eligibility check run yet"
          description="Answer the questions above and press Check eligibility to see what support this person may be entitled to."
        />
      )}

      {/* Likely eligible */}
      {likelyEligible.length > 0 && (
        <div>
          <h3 className="font-bold text-warmstone-800 text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sage-400 inline-block" />
            Likely eligible ({likelyEligible.length})
          </h3>
          <div className="flex flex-col gap-3">
            {likelyEligible.map((e) => <EntitlementCard key={e.id} e={e} />)}
          </div>
        </div>
      )}

      {/* Possibly eligible */}
      {possiblyEligible.length > 0 && (
        <div>
          <h3 className="font-bold text-warmstone-800 text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-honey-400 inline-block" />
            Possibly eligible ({possiblyEligible.length})
          </h3>
          <div className="flex flex-col gap-3">
            {possiblyEligible.map((e) => <EntitlementCard key={e.id} e={e} />)}
          </div>
        </div>
      )}

      {/* Already claiming */}
      {alreadyClaiming.length > 0 && (
        <div>
          <button
            onClick={() => setShowAlreadyClaiming((s) => !s)}
            className="flex items-center gap-2 font-bold text-warmstone-600 text-sm mb-3 min-h-[44px]"
          >
            {showAlreadyClaiming ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Already claiming ({alreadyClaiming.length})
          </button>
          {showAlreadyClaiming && (
            <div className="flex flex-col gap-3">
              {alreadyClaiming.map((e) => <EntitlementCard key={e.id} e={e} />)}
            </div>
          )}
        </div>
      )}

      {/* Dismissed */}
      {dismissed.length > 0 && (
        <p className="text-xs text-warmstone-400">
          {dismissed.length} entitlement{dismissed.length !== 1 ? "s" : ""} dismissed.
        </p>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-warmstone-400 border-t border-warmstone-100 pt-4">
        This information is based on publicly available eligibility criteria and is not formal benefits advice. For formal advice, contact Citizens Advice or a qualified benefits adviser.
      </p>

      {/* Dismiss confirm */}
      <ConfirmModal
        open={!!dismissTarget}
        onClose={() => setDismissTarget(null)}
        onConfirm={() => dismissTarget && dismiss(dismissTarget)}
        title="Dismiss this entitlement"
        description={`Are you sure you want to dismiss "${dismissTarget?.benefit_name}"? You can still see it in the dismissed list.`}
      />

      {/* Already claiming modal */}
      <Modal open={!!claimingTarget} onClose={() => setClaimingTarget(null)} title="Already claiming this benefit" maxWidth="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-warmstone-600">Optionally add the award amount and review date for your records.</p>
          <Input
            label="Award amount"
            value={claimingForm.award_amount}
            onChange={(e) => setClaimingForm((f) => ({ ...f, award_amount: e.target.value }))}
            placeholder="e.g. £108.55/week"
          />
          <Input
            label="Review date"
            type="date"
            value={claimingForm.review_date}
            onChange={(e) => setClaimingForm((f) => ({ ...f, review_date: e.target.value }))}
          />
          <div className="flex gap-3">
            <Button onClick={markClaiming}>Save</Button>
            <Button variant="ghost" onClick={() => setClaimingTarget(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Status update modal */}
      <Modal open={!!statusTarget} onClose={() => setStatusTarget(null)} title="Update application status" maxWidth="sm">
        <div className="flex flex-col gap-4">
          <Select
            label="Status"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value as EntitlementCurrentStatus)}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Button onClick={updateStatus}>Save</Button>
            <Button variant="ghost" onClick={() => setStatusTarget(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
