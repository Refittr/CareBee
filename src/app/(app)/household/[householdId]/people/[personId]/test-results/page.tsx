"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  AlertTriangle,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { TestResultForm } from "@/components/forms/TestResultForm";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateUK } from "@/lib/utils/dates";
import { useAIAccess } from "@/lib/utils/access";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { useCanEdit } from "@/lib/context/role";
import { ScanModal } from "@/components/scan/ScanModal";
import type { TestResult } from "@/lib/types/database";

function ResultValue({ value, isAbnormal }: { value: string | null; isAbnormal: boolean | null }) {
  if (!value) return null;
  const colour =
    isAbnormal === true
      ? "text-error"
      : isAbnormal === false
      ? "text-sage-400"
      : "text-warmstone-800";
  return <p className={`text-2xl font-bold ${colour}`}>{value}</p>;
}

export default function TestResultsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();
  const { hasAccess } = useAIAccess();
  const canEdit = useCanEdit();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TestResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("test_results")
      .select("*")
      .eq("person_id", personId)
      .order("result_date", { ascending: false, nullsFirst: false });
    if (err) setError(err.message);
    else setResults(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [personId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(
    data: Omit<TestResult, "id" | "person_id" | "household_id" | "created_at" | "updated_at">
  ) {
    setSaving(true);
    const { error: err } = await supabase.from("test_results").insert({
      ...data,
      person_id: personId,
      household_id: householdId,
    });
    if (err) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Test result added.", "success");
      setAddOpen(false);
      load();
    }
    setSaving(false);
  }

  async function handleEdit(
    data: Omit<TestResult, "id" | "person_id" | "household_id" | "created_at" | "updated_at">
  ) {
    if (!editTarget) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("test_results")
      .update(data)
      .eq("id", editTarget.id);
    if (err) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Test result updated.", "success");
      setEditTarget(null);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase
      .from("test_results")
      .delete()
      .eq("id", deleteTarget.id);
    if (err) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Test result removed.", "success");
      setDeleteTarget(null);
      load();
    }
    setDeleting(false);
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load test results" description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-warmstone-900">Test Results</h2>
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

      {results.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          heading="No test results recorded"
          description="Add blood test results, blood pressure readings, and other test results to keep track of changes over time."
          ctaLabel="Add a test result"
          onCta={canEdit ? () => setAddOpen(true) : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <Card key={result.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Name + abnormal badge */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-warmstone-900">{result.test_name}</p>
                    {result.is_abnormal === true && (
                      <Badge variant="error">
                        <AlertTriangle size={11} className="mr-1" />
                        Outside normal range
                      </Badge>
                    )}
                    {result.is_abnormal === false && (
                      <span className="inline-flex items-center gap-1 bg-sage-50 text-sage-400 rounded-sm px-2.5 py-0.5 text-xs font-semibold">
                        <CheckCircle size={11} />
                        Within normal range
                      </span>
                    )}
                  </div>

                  {/* Result value */}
                  <ResultValue value={result.result_value} isAbnormal={result.is_abnormal} />

                  {/* Date + normal range */}
                  {result.result_date && (
                    <p className="text-sm text-warmstone-600 mt-1">
                      {formatDateUK(result.result_date)}
                    </p>
                  )}
                  {result.normal_range && (
                    <p className="text-sm text-warmstone-600 mt-0.5">
                      Normal range: {result.normal_range}
                    </p>
                  )}
                  {result.ordered_by && (
                    <p className="text-xs text-warmstone-400 mt-1">
                      Ordered by {result.ordered_by}
                    </p>
                  )}
                  {result.notes && (
                    <p className="text-sm text-warmstone-600 mt-2 whitespace-pre-line">
                      {result.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditTarget(result)}
                      className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(result)}
                      className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a test result" maxWidth="md">
        <TestResultForm
          onSave={handleAdd}
          onCancel={() => setAddOpen(false)}
          loading={saving}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit test result"
        maxWidth="md"
      >
        {editTarget && (
          <TestResultForm
            initial={editTarget}
            onSave={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={saving}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove test result"
        description={`Remove the ${deleteTarget?.test_name ?? "test result"} from ${deleteTarget?.result_date ? formatDateUK(deleteTarget.result_date) : "this record"}? This cannot be undone.`}
        confirmLabel="Remove"
        loading={deleting}
      />

      <ScanModal open={scanOpen} onClose={() => { setScanOpen(false); void load(); }} householdId={householdId} personId={personId} />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
