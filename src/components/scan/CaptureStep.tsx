"use client";

import { useRef, useState } from "react";
import { Camera, Upload, X, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CaptureStepProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CaptureStep({ onCapture, onCancel }: CaptureStepProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  function handleClear() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
  }

  function handleContinue() {
    if (selectedFile) onCapture(selectedFile);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warmstone-100 shrink-0">
        <div className="flex items-center gap-2">
          <ScanLine size={20} className="text-honey-400" />
          <h2 className="font-bold text-warmstone-900 text-lg">Scan a document</h2>
        </div>
        <button
          onClick={onCancel}
          className="text-warmstone-400 hover:text-warmstone-800 transition-colors p-2 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        {!preview ? (
          <>
            <p className="text-warmstone-600 text-sm leading-relaxed">
              Take a photo of a letter, prescription, or any document. CareBee will read it and extract the details for you.
            </p>

            <div className="flex flex-col gap-3">
              {/* Camera button */}
              <Button
                fullWidth
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={18} />
                Take a photo
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelected}
              />

              {/* File picker button */}
              <Button
                fullWidth
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} />
                Choose a file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>

            {/* Tips */}
            <div className="bg-warmstone-50 border border-warmstone-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-warmstone-700 mb-2">For best results:</p>
              <ul className="text-xs text-warmstone-600 flex flex-col gap-1">
                <li>Lay the document flat in good light</li>
                <li>Make sure all text is in the frame and in focus</li>
                <li>Avoid shadows across the text</li>
                <li>Supports NHS letters, prescriptions, appointment letters, and more</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-warmstone-600">
              Check the preview below, then tap Continue to extract the data.
            </p>

            {/* Preview */}
            <div className="relative rounded-xl overflow-hidden border border-warmstone-200 bg-warmstone-50">
              {selectedFile?.type === "application/pdf" ? (
                <div className="aspect-video flex flex-col items-center justify-center gap-3">
                  <Upload size={40} className="text-warmstone-400" />
                  <p className="text-sm font-semibold text-warmstone-700">{selectedFile.name}</p>
                  <p className="text-xs text-warmstone-400">PDF document</p>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Document preview"
                  className="w-full object-contain max-h-80"
                />
              )}
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-warmstone-900/60 text-warmstone-white rounded-full p-1.5 hover:bg-warmstone-900/80 transition-colors"
                aria-label="Remove selected file"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-warmstone-400 text-center">
              {selectedFile?.name}
              {selectedFile?.size
                ? ` (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB)`
                : ""}
            </p>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-warmstone-100 px-4 py-4 flex gap-3">
        <Button variant="ghost" onClick={onCancel} fullWidth>
          Cancel
        </Button>
        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!selectedFile}
        >
          <ScanLine size={16} />
          Continue
        </Button>
      </div>
    </div>
  );
}
