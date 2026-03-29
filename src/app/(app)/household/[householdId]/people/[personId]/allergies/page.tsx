"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { AllergyForm } from "@/components/forms/AllergyForm";
import { useAppToast } from "@/components/layout/AppShell";
import { useAIAccess } from "@/lib/utils/access";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { useCanEdit } from "@/lib/context/role";
import { ScanModal } from "@/components/scan/ScanModal";
import type { Allergy } from "@/lib/types/database";

const severityVariant = (s: string | null): "active" | "warning" | "error" | "neutral" => {
  if (s === "Mild") return "active";
  if (s === "Moderate") return "warning";
  if (s === "Severe") return "error";
  return "neutral";
};

export default function AllergiesPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();
  const { hasAccess } = useAIAccess(householdId);
  const canEdit = useCanEdit();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Allergy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Allergy | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase.from("allergies").select("*").eq("person_id", personId).order("created_at");
    if (err) setError(err.message);
    else setAllergies(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [personId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("allergies").delete().eq("id", deleteTarget.id);
    if (err) addToast("Something went wrong. Please try again.", "error");
    else { addToast("Allergy removed.", "success"); setDeleteTarget(null); load(); }
    setDeleting(false);
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load allergies" description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="font-bold text-warmstone-900">Allergies</h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => hasAccess === false ? setShowUpgrade(true) : setScanOpen(true)}>
              <Sparkles size={16} />
              <span className="hidden md:inline">Scan in a document</span>
              <span className="md:hidden">Scan</span>
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add
            </Button>
          </div>
        )}
      </div>

      {allergies.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          heading="No known allergies"
          description="That is good news. If anything changes, add it here so it shows on the emergency summary."
          ctaLabel="Add an allergy"
          onCta={canEdit ? () => setAddOpen(true) : undefined}
          iconColor="text-sage-400"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {allergies.map((allergy) => (
            <Card key={allergy.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-warmstone-900">{allergy.name}</h3>
                    {allergy.severity && (
                      <Badge variant={severityVariant(allergy.severity)}>{allergy.severity}</Badge>
                    )}
                  </div>
                  {allergy.reaction && <p className="text-sm text-warmstone-600">Reaction: {allergy.reaction}</p>}
                  {allergy.notes && <p className="text-sm text-warmstone-400 mt-1">{allergy.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditTarget(allergy)} className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Pencil size={16} /></button>
                    <button onClick={() => setDeleteTarget(allergy)} className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add an allergy">
        <AllergyForm householdId={householdId} personId={personId} onSaved={() => { setAddOpen(false); load(); }} onCancel={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit allergy">
        {editTarget && <AllergyForm householdId={householdId} personId={personId} allergy={editTarget} onSaved={() => { setEditTarget(null); load(); }} onCancel={() => setEditTarget(null)} />}
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove allergy" description={`Are you sure you want to remove the allergy to "${deleteTarget?.name}"?`} loading={deleting} />

      <ScanModal open={scanOpen} onClose={() => { setScanOpen(false); void load(); }} householdId={householdId} personId={personId} />
      <UpgradeModal householdId={householdId} open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
