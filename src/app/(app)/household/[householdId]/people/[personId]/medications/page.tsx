"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Pill, RefreshCw } from "lucide-react";
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
import type { Medication, MedicationChange } from "@/lib/types/database";

export default function MedicationsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [changes, setChanges] = useState<MedicationChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Medication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: meds, error: err }, { data: mc }] = await Promise.all([
      supabase.from("medications").select("*").eq("person_id", personId).order("created_at", { ascending: false }),
      supabase.from("medication_changes").select("*").eq("person_id", personId).order("change_date", { ascending: false }),
    ]);
    if (err) setError(err.message);
    else { setMedications(meds ?? []); setChanges(mc ?? []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [personId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("medications").delete().eq("id", deleteTarget.id);
    if (err) addToast("Something went wrong. Please try again.", "error");
    else { addToast("Medication removed.", "success"); setDeleteTarget(null); load(); }
    setDeleting(false);
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load medications" description={error} />;

  const active = medications.filter((m) => m.is_active);
  const past = medications.filter((m) => !m.is_active);

  function latestChange(medId: string) {
    return changes.find((c) => c.medication_id === medId);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-warmstone-900">Medications</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add a medication
        </Button>
      </div>

      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          heading="No medications recorded"
          description="Add medications so you have a complete list across all prescribers."
          ctaLabel="Add a medication"
          onCta={() => setAddOpen(true)}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {active.map((med) => {
              const change = latestChange(med.id);
              return (
                <Card key={med.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-warmstone-900">{med.name}</h3>
                        <Badge variant="active">Active</Badge>
                      </div>
                      {(med.dosage || med.frequency) && (
                        <p className="text-sm text-warmstone-600">
                          {[med.dosage, med.frequency].filter(Boolean).join(", ")}
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
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditTarget(med)} className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Edit"><Pencil size={16} /></button>
                      <button onClick={() => setDeleteTarget(med)} className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 size={16} /></button>
                    </div>
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
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditTarget(med)} className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteTarget(med)} className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a medication" maxWidth="lg">
        <MedicationForm householdId={householdId} personId={personId} onSaved={() => { setAddOpen(false); load(); }} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit medication" maxWidth="lg">
        {editTarget && <MedicationForm householdId={householdId} personId={personId} medication={editTarget} onSaved={() => { setEditTarget(null); load(); }} onCancel={() => setEditTarget(null)} />}
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove medication" description={`Are you sure you want to remove "${deleteTarget?.name}"? This cannot be undone.`} loading={deleting} />
    </div>
  );
}
