"use client";

import { useState } from "react";
import { ScanLine, RefreshCw, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useAppToast } from "@/components/layout/AppShell";
import { CaptureStep } from "./CaptureStep";
import { ProcessingStep } from "./ProcessingStep";
import { ReviewStep } from "./ReviewStep";
import type { ScanResult } from "@/lib/types/scan";

type Step = "capture" | "uploading" | "reading" | "review" | "error" | "empty";

interface ScanModalProps {
  open: boolean;
  onClose: () => void;
  householdId: string;
  personId: string;
}

export function ScanModal({ open, onClose, householdId, personId }: ScanModalProps) {
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [step, setStep] = useState<Step>("capture");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string>("image/jpeg");

  function handleClose() {
    // Reset state on close
    setStep("capture");
    setScanResult(null);
    setErrorMessage(null);
    setUploadedFilePaths([]);
    onClose();
  }

  async function handleCapture(files: File[]) {
    const firstFile = files[0];
    setUploadedFileName(firstFile.name);
    setUploadedFileSize(firstFile.size);
    setUploadedMimeType(firstFile.type || "image/jpeg");

    // Step 1: Upload all files
    setStep("uploading");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("You must be signed in to scan documents.");
      setStep("error");
      return;
    }

    const timestamp = Date.now();
    const filePaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${householdId}/scans/${timestamp}_p${i + 1}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        setErrorMessage(
          "We could not upload your document. Please check your connection and try again."
        );
        setStep("error");
        return;
      }

      filePaths.push(filePath);
    }

    setUploadedFilePaths(filePaths);

    // Step 2: AI reading
    setStep("reading");

    let result: Response;
    try {
      result = await fetch("/api/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_paths: filePaths,
          person_id: personId,
          household_id: householdId,
        }),
      });
    } catch {
      setErrorMessage(
        "Something went wrong while reading your document. Please try again."
      );
      setStep("error");
      return;
    }

    if (!result.ok) {
      const data = await result.json().catch(() => ({}));
      setErrorMessage(
        (data as { error?: string }).error ??
          "Something went wrong while reading your document. Please try again."
      );
      setStep("error");
      return;
    }

    const data = (await result.json()) as ScanResult;

    // Check if any data was actually extracted
    const hasData =
      (data.medications?.length ?? 0) > 0 ||
      (data.conditions?.length ?? 0) > 0 ||
      (data.allergies?.length ?? 0) > 0 ||
      (data.appointments?.length ?? 0) > 0 ||
      (data.test_results?.length ?? 0) > 0 ||
      (data.referrals?.length ?? 0) > 0 ||
      (data.follow_up_actions?.length ?? 0) > 0 ||
      (data.professional_contacts?.length ?? 0) > 0 ||
      !!data.benefit ||
      !!data.imaging_report;

    if (!hasData) {
      setStep("empty");
      return;
    }

    setScanResult(data);
    setStep("review");
  }

  function handleSaved(count: number) {
    addToast(
      `Added ${count} ${count === 1 ? "item" : "items"} from your document.`,
      "success"
    );
    handleClose();
  }

  function handleRetry() {
    setStep("capture");
    setScanResult(null);
    setErrorMessage(null);
    setUploadedFilePaths([]);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-warmstone-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Scan a document"
    >
      {step === "capture" && (
        <CaptureStep onCapture={handleCapture} onCancel={handleClose} />
      )}

      {(step === "uploading" || step === "reading") && (
        <>
          {/* Minimal header during processing */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-warmstone-100">
            <ScanLine size={18} className="text-honey-400" />
            <span className="font-bold text-warmstone-900">Scan a document</span>
          </div>
          <ProcessingStep stage={step === "uploading" ? "uploading" : "reading"} />
        </>
      )}

      {step === "review" && scanResult && uploadedFilePaths.length > 0 && (
        <ReviewStep
          scanResult={scanResult}
          filePath={uploadedFilePaths[0]}
          fileName={uploadedFileName}
          fileSize={uploadedFileSize}
          mimeType={uploadedMimeType}
          householdId={householdId}
          personId={personId}
          onSaved={handleSaved}
          onDiscard={handleClose}
        />
      )}

      {step === "empty" && (
        <>
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-warmstone-100">
            <div className="flex items-center gap-2">
              <ScanLine size={18} className="text-honey-400" />
              <span className="font-bold text-warmstone-900">Scan a document</span>
            </div>
            <button onClick={handleClose} className="text-warmstone-400 hover:text-warmstone-700 transition-colors p-1" aria-label="Close">✕</button>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 gap-6 text-center max-w-sm mx-auto">
          <ScanLine size={48} className="text-warmstone-300" />
          <div>
            <h2 className="text-xl font-bold text-warmstone-900 mb-2">
              We could not find any health data in this document
            </h2>
            <p className="text-sm text-warmstone-600 leading-relaxed">
              This might not be a medical document, or the photo might be unclear.
              You can try again with a different photo, or upload the document manually.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button fullWidth onClick={handleRetry}>
              <RefreshCw size={16} />
              Try again
            </Button>
            <Button fullWidth variant="ghost" onClick={handleClose}>
              <Upload size={16} />
              Upload manually
            </Button>
          </div>
        </div>
        </>
      )}

      {step === "error" && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 gap-6 text-center max-w-sm mx-auto">
          <ScanLine size={48} className="text-warmstone-300" />
          <div>
            <h2 className="text-xl font-bold text-warmstone-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-warmstone-600 leading-relaxed">
              {errorMessage ??
                "We could not read your document right now. Please try again in a moment."}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button fullWidth onClick={handleRetry}>
              <RefreshCw size={16} />
              Try again
            </Button>
            <Button fullWidth variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
