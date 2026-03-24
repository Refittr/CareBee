"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import { trackFeatureUsage } from "@/lib/utils/analytics";
import type { DocumentType } from "@/lib/types/database";

const ACCEPTED = "image/jpeg,image/png,image/heic,application/pdf";
const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "discharge_summary", label: "Discharge Summary" },
  { value: "prescription", label: "Prescription" },
  { value: "test_result", label: "Test Result" },
  { value: "appointment_letter", label: "Appointment Letter" },
  { value: "benefit_letter", label: "Benefit Letter" },
  { value: "poa_document", label: "POA Document" },
  { value: "care_plan", label: "Care Plan" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

interface DocumentUploadProps {
  householdId: string;
  personId: string;
  onUploaded: () => void;
  onCancel: () => void;
}

export function DocumentUpload({ householdId, personId, onUploaded, onCancel }: DocumentUploadProps) {
  const supabase = createClient();
  const { addToast } = useAppToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType | "">("");
  const [description, setDescription] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [docTypeError, setDocTypeError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a file."); return; }
    if (!docType) { setDocTypeError("Please select a document type."); return; }
    setDocTypeError(null); setError(null); setLoading(true); setProgress(10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setLoading(false); return; }

    const ext = file.name.split(".").pop();
    const filename = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${user.id}/${householdId}/${filename}`;

    setProgress(30);
    const { error: uploadErr } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadErr) { setError(uploadErr.message); setLoading(false); return; }

    setProgress(70);
    const { error: dbErr } = await supabase.from("documents").insert({
      person_id: personId,
      household_id: householdId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      document_type: docType,
      description: description || null,
      document_date: documentDate || null,
      uploaded_by: user.id,
    });

    setProgress(100);
    if (dbErr) {
      await supabase.storage.from("documents").remove([filePath]);
      setError(dbErr.message);
      setLoading(false);
    } else {
      void trackFeatureUsage("documents", "document_uploaded", "person", personId, { document_type: docType });
      addToast("Document uploaded.", "success");
      onUploaded();
    }
  }

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-4">
      {error && <Alert type="error" description={error} />}

      {!file ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-warmstone-200 rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-warmstone-50 transition-colors"
        >
          <Upload size={32} className="text-warmstone-400" />
          <p className="text-sm font-semibold text-warmstone-600">Click to select a file</p>
          <p className="text-xs text-warmstone-400">PDF, JPG, PNG, or HEIC</p>
          <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="bg-warmstone-50 border border-warmstone-100 rounded-lg p-4 flex items-center gap-3">
          <FileText size={24} className="text-warmstone-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warmstone-800 truncate">{file.name}</p>
            <p className="text-xs text-warmstone-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button type="button" onClick={() => setFile(null)} className="text-warmstone-400 hover:text-warmstone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"><X size={16} /></button>
        </div>
      )}

      <Select label="Document type" value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)} required error={docTypeError ?? undefined}>
        <option value="">Select type</option>
        {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </Select>

      <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
      <Input label="Document date" type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} hint="When was this document issued? (Not when you uploaded it)" />

      {loading && (
        <div className="w-full bg-warmstone-100 rounded-full h-2">
          <div className="bg-honey-400 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}><Upload size={16} /> Upload</Button>
      </div>
    </form>
  );
}
