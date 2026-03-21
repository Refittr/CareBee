"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, HeartPulse } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { ConditionForm } from "@/components/forms/ConditionForm";
import { formatDateUK } from "@/lib/utils/dates";
import { truncateText } from "@/lib/utils/formatting";
import { useAppToast } from "@/components/layout/AppShell";
import type { Condition } from "@/lib/types/database";

export default function ConditionsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Condition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Condition | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("conditions")
      .select("*")
      .eq("person_id", personId)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setConditions(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [personId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("conditions").delete().eq("id", deleteTarget.id);
    if (err) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Condition removed.", "success");
      setDeleteTarget(null);
      load();
    }
    setDeleting(false);
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load conditions" description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-warmstone-900">Conditions</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add a condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          heading="No conditions recorded"
          description="Add your loved one's conditions and diagnoses so everything is in one place."
          ctaLabel="Add a condition"
          onCta={() => setAddOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {conditions.map((condition) => {
            const isExpanded = expanded[condition.id];
            const shouldTruncate = (condition.notes?.length ?? 0) > 120;
            return (
              <Card key={condition.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-warmstone-900">{condition.name}</h3>
                      <Badge variant={condition.is_active ? "active" : "neutral"}>
                        {condition.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {(condition.date_diagnosed || condition.diagnosed_by || condition.diagnosed_at_location) && (
                      <p className="text-sm text-warmstone-600 mt-1">
                        {condition.date_diagnosed && `Diagnosed ${formatDateUK(condition.date_diagnosed)}`}
                        {condition.diagnosed_by && ` by ${condition.diagnosed_by}`}
                        {condition.diagnosed_at_location && ` at ${condition.diagnosed_at_location}`}
                      </p>
                    )}
                    {condition.current_status && (
                      <p className="text-sm text-warmstone-600">{condition.current_status}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditTarget(condition)}
                      className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(condition)}
                      className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {condition.notes && (
                  <div>
                    <p className="text-sm text-warmstone-600">
                      {shouldTruncate && !isExpanded ? truncateText(condition.notes, 120) : condition.notes}
                    </p>
                    {shouldTruncate && (
                      <button
                        onClick={() => setExpanded((e) => ({ ...e, [condition.id]: !e[condition.id] }))}
                        className="text-xs text-honey-600 font-semibold mt-1"
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a condition">
        <ConditionForm
          householdId={householdId}
          personId={personId}
          onSaved={() => { setAddOpen(false); load(); }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit condition">
        {editTarget && (
          <ConditionForm
            householdId={householdId}
            personId={personId}
            condition={editTarget}
            onSaved={() => { setEditTarget(null); load(); }}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove condition"
        description={`Are you sure you want to remove "${deleteTarget?.name}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
