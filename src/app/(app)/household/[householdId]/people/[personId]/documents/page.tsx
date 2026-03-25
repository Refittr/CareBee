"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Trash2, FileUp, Sparkles, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ScanModal } from "@/components/scan/ScanModal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { DocumentUpload } from "@/components/forms/DocumentUpload";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateUK } from "@/lib/utils/dates";
import { formatDocumentType } from "@/lib/utils/formatting";
import type { Document, DocumentType } from "@/lib/types/database";
import { useCanEdit } from "@/lib/context/role";
import { useAIAccess } from "@/lib/utils/access";
import { UpgradeModal } from "@/components/ui/UpgradeModal";

export default function DocumentsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const canEdit = useCanEdit();
  const { hasAccess } = useAIAccess(householdId);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleScanClick() {
    if (hasAccess === false) {
      setShowUpgrade(true);
    } else {
      setScanOpen(true);
    }
  }

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("documents")
      .select("*")
      .eq("person_id", personId)
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }

    const docs = data ?? [];
    setDocuments(docs);

    if (docs.length > 0) {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrls(docs.map((d) => d.file_path), 3600);
      if (signed) {
        const urlMap: Record<string, string> = {};
        signed.forEach((s, i) => {
          if (s.signedUrl && docs[i]) urlMap[docs[i].id] = s.signedUrl;
        });
        setSignedUrls(urlMap);
      }
    }

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

  function isImage(mimeType: string | null) {
    return mimeType?.startsWith("image/") ?? false;
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load documents" description={error} />;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-warmstone-900">Documents</h2>

      {canEdit && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleScanClick}
            className="flex-1 flex items-start gap-3 bg-sage-400 hover:bg-sage-600 text-warmstone-white rounded-xl p-4 transition-colors text-left"
          >
            <Sparkles size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Scan document with AI</p>
              <p className="text-xs text-sage-100 mt-0.5">Our AI reads your document and adds the details to your record automatically</p>
            </div>
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex-1 flex items-start gap-3 border border-warmstone-200 hover:bg-warmstone-100 text-warmstone-800 rounded-xl p-4 transition-colors text-left"
          >
            <Upload size={20} className="shrink-0 mt-0.5 text-warmstone-500" />
            <div>
              <p className="font-bold text-sm">Upload without scanning</p>
              <p className="text-xs text-warmstone-500 mt-0.5">Just store the file. Nothing will be added to your record.</p>
            </div>
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-4">
          <FileUp size={48} className="text-warmstone-400" strokeWidth={1.5} />
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-warmstone-900">No documents yet</h3>
            <p className="text-warmstone-600 text-sm max-w-xs">
              Photograph or upload a letter, prescription, or test result. Our AI will read it and add the details to your record for you.
            </p>
          </div>
          {canEdit && (
            <>
              <Button onClick={handleScanClick} variant="secondary" className="mt-1 gap-2">
                <Sparkles size={16} />
                Scan your first document
              </Button>
              <button
                onClick={() => setUploadOpen(true)}
                className="text-sm text-warmstone-500 hover:text-warmstone-800 transition-colors"
              >
                Or just upload a file without scanning
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {documents.map((doc) => {
            const url = signedUrls[doc.id] ?? "";
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
                  {canEdit && (
                    <button
                      onClick={() => setDeleteTarget(doc)}
                      className="mt-2 text-xs text-error hover:underline flex items-center gap-1 min-h-[44px]"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
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
      <ScanModal
        open={scanOpen}
        onClose={() => { setScanOpen(false); load(); }}
        householdId={householdId}
        personId={personId}
      />
      <UpgradeModal householdId={householdId} open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
