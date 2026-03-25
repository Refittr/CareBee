"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Pencil, Trash2, Pill, RefreshCw, Tag, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { MedicationForm } from "@/components/forms/MedicationForm";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateUK } from "@/lib/utils/dates";
import { useAIAccess } from "@/lib/utils/access";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { useCanEdit } from "@/lib/context/role";
import { ScanModal } from "@/components/scan/ScanModal";
import type { Medication, MedicationChange, Condition, DrugInteraction } from "@/lib/types/database";

export default function MedicationsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const { hasAccess } = useAIAccess(householdId);
  const canEdit = useCanEdit();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [medications, setMedications] = useState<Medication[]>([]);
  const [changes, setChanges] = useState<MedicationChange[]>([]);
  const [conditions, setConditions] = useState<Pick<Condition, "id" | "name">[]>([]);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [lastInteractionCheck, setLastInteractionCheck] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Medication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [interactionsOpen, setInteractionsOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: meds, error: err }, { data: mc }, { data: conds }, { data: iacts }] = await Promise.all([
      supabase.from("medications").select("*").eq("person_id", personId).order("created_at", { ascending: false }),
      supabase.from("medication_changes").select("*").eq("person_id", personId).order("change_date", { ascending: false }),
      supabase.from("conditions").select("id, name").eq("person_id", personId).eq("is_active", true).order("name"),
      supabase.from("drug_interactions").select("*").eq("person_id", personId).order("created_at", { ascending: false }),
    ]);
    if (err) setError(err.message);
    else {
      setMedications(meds ?? []);
      setChanges(mc ?? []);
      setConditions(conds ?? []);
      setInteractions(iacts ?? []);
      if ((iacts ?? []).length > 0) {
        setLastInteractionCheck((iacts ?? [])[0]?.created_at ?? null);
      }
    }
    setLoading(false);
  }, [personId, supabase]);

  useEffect(() => { load(); }, [load]);

  async function triggerInteractionCheck() {
    setCheckingInteractions(true);
    try {
      const res = await fetch("/api/medications/check-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, household_id: householdId }),
      });
      const data = await res.json();
      if (res.ok) {
        setInteractions(data.interactions ?? []);
      }
    } catch {
      // Silently fail, interaction check is non-blocking
    } finally {
      setCheckingInteractions(false);
    }
  }

  async function afterMedSave() {
    await load();
    triggerInteractionCheck();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("medications").delete().eq("id", deleteTarget.id);
    if (err) addToast("Something went wrong. Please try again.", "error");
    else {
      addToast("Medication removed.", "success");
      setDeleteTarget(null);
      await load();
      triggerInteractionCheck();
    }
    setDeleting(false);
  }

  async function acknowledgeInteraction(id: string) {
    await supabase.from("drug_interactions").update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
    }).eq("id", id);
    setInteractions((prev) => prev.map((i) => i.id === id ? { ...i, status: "acknowledged" } : i));
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load medications" description={error} />;

  const active = medications.filter((m) => m.is_active);
  const past = medications.filter((m) => !m.is_active);

  const activeInteractions = interactions.filter((i) => i.status === "active");
  const severeInteractions = activeInteractions.filter((i) => i.severity === "severe");
  const moderateInteractions = activeInteractions.filter((i) => i.severity === "moderate");

  // Which medication names are involved in active interactions
  const interactionMedNames = new Set(
    activeInteractions.flatMap((i) => [i.medication_a.toLowerCase(), i.medication_b.toLowerCase()])
  );

  function latestChange(medId: string) {
    return changes.find((c) => c.medication_id === medId);
  }

  function conditionName(conditionId: string | null) {
    if (!conditionId) return null;
    return conditions.find((c) => c.id === conditionId)?.name ?? null;
  }

  function interactionIcon(medName: string) {
    const lower = medName.toLowerCase();
    if (!interactionMedNames.has(lower)) return null;
    const medsInteractions = activeInteractions.filter(
      (i) => i.medication_a.toLowerCase() === lower || i.medication_b.toLowerCase() === lower
    );
    const hasSevere = medsInteractions.some((i) => i.severity === "severe");
    const hasModerate = medsInteractions.some((i) => i.severity === "moderate");
    const color = hasSevere ? "text-error" : hasModerate ? "text-honey-600" : "text-warmstone-400";
    return (
      <span title="Drug interaction flagged">
        <AlertTriangle size={14} className={color} />
      </span>
    );
  }

  const severityConfig = {
    severe: { badge: "bg-red-100 text-error", label: "Severe" },
    moderate: { badge: "bg-honey-50 text-honey-800", label: "Moderate" },
    mild: { badge: "bg-warmstone-100 text-warmstone-600", label: "Mild" },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Interaction banners */}
      {severeInteractions.length > 0 && (
        <Alert
          type="error"
          title={`${severeInteractions.length} drug interaction${severeInteractions.length === 1 ? "" : "s"} may need attention`}
          description="Review the interactions below or discuss with your GP."
        />
      )}
      {severeInteractions.length === 0 && moderateInteractions.length > 0 && (
        <Alert
          type="warning"
          title={`${moderateInteractions.length} potential drug interaction${moderateInteractions.length === 1 ? "" : "s"} worth knowing about`}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-warmstone-900">Medications</h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => hasAccess === false ? setShowUpgrade(true) : setScanOpen(true)}>
              <Sparkles size={16} /> Scan with AI
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add
            </Button>
          </div>
        )}
      </div>

      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          heading="No medications recorded"
          description="Add medications so you have a complete list across all prescribers."
          ctaLabel="Add a medication"
          onCta={canEdit ? () => setAddOpen(true) : undefined}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {active.map((med) => {
              const change = latestChange(med.id);
              const linked = conditionName(med.condition_id);
              return (
                <Card key={med.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-warmstone-900">{med.name}</h3>
                        <Badge variant="active">Active</Badge>
                        {interactionIcon(med.name)}
                      </div>
                      {(med.dosage || med.frequency) && (
                        <p className="text-sm text-warmstone-600">
                          {[med.dosage, med.frequency].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {linked && (
                        <p className="text-sm text-warmstone-500 flex items-center gap-1 mt-0.5">
                          <Tag size={12} />
                          {linked}
                        </p>
                      )}
                      {med.purpose && <p className="text-sm text-warmstone-600">For: {med.purpose}</p>}
                      {med.prescribed_by && <p className="text-sm text-warmstone-400">Prescribed by {med.prescribed_by}</p>}
                      {med.start_date && <p className="text-sm text-warmstone-400">Started {formatDateUK(med.start_date)}</p>}
                      {change && (
                        <div className="mt-3 bg-honey-50 rounded-lg px-3 py-2.5 flex items-start gap-2">
                          <RefreshCw size={14} className="text-honey-800 shrink-0 mt-0.5" />
                          <p className="text-xs text-honey-800">
                            Changed on {formatDateUK(change.change_date)}: {change.change_description}
                            {change.reason && ` because ${change.reason}`}
                          </p>
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditTarget(med)} className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Edit"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(med)} className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {past.length > 0 && (
            <div>
              <button
                onClick={() => setPastOpen((o) => !o)}
                className="text-sm font-semibold text-warmstone-600 hover:text-warmstone-900 transition-colors min-h-[44px] flex items-center gap-2"
              >
                {pastOpen ? "Hide" : "Show"} past medications ({past.length})
              </button>
              {pastOpen && (
                <div className="flex flex-col gap-3 mt-3 opacity-70">
                  {past.map((med) => (
                    <Card key={med.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-warmstone-800">{med.name}</h3>
                            <Badge variant="neutral">Past</Badge>
                          </div>
                          {(med.dosage || med.frequency) && (
                            <p className="text-sm text-warmstone-400">{[med.dosage, med.frequency].filter(Boolean).join(", ")}</p>
                          )}
                          {conditionName(med.condition_id) && (
                            <p className="text-sm text-warmstone-400 flex items-center gap-1">
                              <Tag size={12} />
                              {conditionName(med.condition_id)}
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditTarget(med)} className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget(med)} className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Interactions section */}
      {interactions.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setInteractionsOpen((o) => !o)}
              className="flex items-center gap-2 font-bold text-warmstone-900 min-h-[44px]"
            >
              <AlertTriangle size={16} className={severeInteractions.length > 0 ? "text-error" : "text-honey-600"} />
              Drug Interactions ({activeInteractions.length} active)
              {interactionsOpen ? <ChevronUp size={16} className="text-warmstone-400" /> : <ChevronDown size={16} className="text-warmstone-400" />}
            </button>
            <div className="flex items-center gap-2">
              {lastInteractionCheck && (
                <p className="text-xs text-warmstone-400">
                  Checked {formatDateUK(lastInteractionCheck)}
                </p>
              )}
              <button
                onClick={() => hasAccess === false ? setShowUpgrade(true) : triggerInteractionCheck()}
                disabled={checkingInteractions}
                className="text-xs text-warmstone-500 hover:text-warmstone-800 min-h-[36px] px-2 flex items-center gap-1"
              >
                <RefreshCw size={12} className={checkingInteractions ? "animate-spin" : ""} />
                Recheck
              </button>
            </div>
          </div>

          {interactionsOpen && (
            <div className="flex flex-col gap-3">
              {interactions.map((interaction) => {
                const cfg = severityConfig[interaction.severity] ?? severityConfig.mild;
                const isAcknowledged = interaction.status === "acknowledged";
                return (
                  <Card key={interaction.id} className={`p-4 ${isAcknowledged ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className="font-semibold text-warmstone-900 text-sm">
                          {interaction.medication_a} + {interaction.medication_b}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-warmstone-700 mb-1">{interaction.description}</p>
                    {interaction.mechanism && (
                      <p className="text-xs text-warmstone-400 mb-2">{interaction.mechanism}</p>
                    )}
                    <p className="text-sm font-semibold text-warmstone-800 mb-3">{interaction.recommendation}</p>
                    {!isAcknowledged && (
                      <button
                        onClick={() => acknowledgeInteraction(interaction.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-md transition-colors min-h-[36px]"
                      >
                        <CheckCircle size={14} />
                        Discussed with GP
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a medication" maxWidth="lg">
        <MedicationForm householdId={householdId} personId={personId} conditions={conditions} onSaved={() => { setAddOpen(false); afterMedSave(); }} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit medication" maxWidth="lg">
        {editTarget && <MedicationForm householdId={householdId} personId={personId} medication={editTarget} conditions={conditions} onSaved={() => { setEditTarget(null); afterMedSave(); }} onCancel={() => setEditTarget(null)} />}
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove medication" description={`Are you sure you want to remove "${deleteTarget?.name}"? This cannot be undone.`} loading={deleting} />

      <ScanModal open={scanOpen} onClose={() => { setScanOpen(false); void afterMedSave(); }} householdId={householdId} personId={personId} />
      <UpgradeModal householdId={householdId} open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
