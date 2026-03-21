"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, FileText, Trash2, FileUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { DocumentUpload } from "@/components/forms/DocumentUpload";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateUK } from "@/lib/utils/dates";
import { formatDocumentType } from "@/lib/utils/formatting";
import type { Document, DocumentType } from "@/lib/types/database";

export default function DocumentsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("documents")
      .select("*")
      .eq("person_id", personId)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setDocuments(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [personId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.storage.from("documents").remove([deleteTarget.file_path]);
    const { error: err } = await supabase.from("documents").delete().eq("id", deleteTarget.id);
    if (err) addToast("Something went wrong. Please try again.", "error");
    else { addToast("Document removed.", "success"); setDeleteTarget(null); load(); }
    setDeleting(false);
  }

  function getPublicUrl(path: string) {
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    return data.publicUrl;
  }

  function isImage(mimeType: string | null) {
    return mimeType?.startsWith("image/") ?? false;
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load documents" description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-warmstone-900">Documents</h2>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus size={16} /> Upload a document
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileUp}
          heading="No documents yet"
          description="Upload discharge letters, prescriptions, test results, and anything else you want to keep safe."
          ctaLabel="Upload a document"
          onCta={() => setUploadOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {documents.map((doc) => {
            const url = getPublicUrl(doc.file_path);
            return (
              <Card key={doc.id} className="overflow-hidden">
                <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="aspect-video bg-warmstone-100 flex items-center justify-center overflow-hidden">
                    {isImage(doc.mime_type) ? (
                      <img src={url} alt={doc.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <FileText size={32} className="text-warmstone-400" />
                    )}
                  </div>
                </a>
                <div className="p-3">
                  <p className="text-xs font-semibold text-warmstone-800 truncate mb-1">{doc.file_name}</p>
                  <Badge variant="neutral">{formatDocumentType(doc.document_type as DocumentType)}</Badge>
                  {doc.document_date && <p className="text-xs text-warmstone-400 mt-1">{formatDateUK(doc.document_date)}</p>}
                  {doc.description && <p className="text-xs text-warmstone-600 mt-1 truncate">{doc.description}</p>}
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="mt-2 text-xs text-error hover:underline flex items-center gap-1 min-h-[44px]"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload a document" maxWidth="md">
        <DocumentUpload householdId={householdId} personId={personId} onUploaded={() => { setUploadOpen(false); load(); }} onCancel={() => setUploadOpen(false)} />
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove document" description={`Are you sure you want to remove "${deleteTarget?.file_name}"? This cannot be undone.`} loading={deleting} />
    </div>
  );
}
