"use client";

import { useRef, useState } from "react";
import { Camera, Upload, X, ScanLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CaptureStepProps {
  onCapture: (files: File[]) => void;
  onCancel: () => void;
}

const MAX_PAGES = 10;

export function CaptureStep({ onCapture, onCancel }: CaptureStepProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // images: array of pages; pdf: single PDF file (mutually exclusive)
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);

  function addImages(incoming: FileList | null) {
    if (!incoming) return;
    const newFiles = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    if (!newFiles.length) return;
    // Clear any PDF selection
    setPdf(null);
    setImages((prev) => {
      const combined = [
        ...prev,
        ...newFiles.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
      ].slice(0, MAX_PAGES);
      return combined;
    });
  }

  function handlePdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    // Clear images when a PDF is chosen
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setPdf(file);
    e.target.value = "";
  }

  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    addImages(e.target.files);
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleClear() {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setPdf(null);
  }

  function handleContinue() {
    if (pdf) {
      onCapture([pdf]);
    } else if (images.length > 0) {
      onCapture(images.map((img) => img.file));
    }
  }

  const hasSelection = pdf !== null || images.length > 0;
  const canAddMore = !pdf && images.length < MAX_PAGES;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warmstone-100 shrink-0">
        <div className="flex items-center gap-2">
          <ScanLine size={20} className="text-honey-400" />
          <h2 className="font-bold text-warmstone-900 text-lg">AI scan</h2>
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
      <div className="flex-1 px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        {!hasSelection ? (
          <>
            <p className="text-warmstone-600 text-sm leading-relaxed">
              Take a photo of a letter, prescription, or any document. For multi-page documents, add each page separately. CareBee will read everything and extract the details for you.
            </p>

            <div className="flex flex-col gap-3">
              <Button fullWidth onClick={() => cameraInputRef.current?.click()}>
                <Camera size={18} />
                Take a photo
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelected}
              />

              <Button fullWidth variant="ghost" onClick={() => fileInputRef.current?.click()}>
                <Upload size={18} />
                Choose a file
              </Button>
              {/* Single input supporting both images and PDFs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type === "application/pdf") {
                    handlePdfSelected(e);
                  } else {
                    handleImageSelected(e);
                  }
                  e.target.value = "";
                }}
              />
            </div>

            <div className="bg-warmstone-50 border border-warmstone-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-warmstone-700 mb-2">For best results:</p>
              <ul className="text-xs text-warmstone-600 flex flex-col gap-1">
                <li>Lay the document flat in good light</li>
                <li>Make sure all text is in the frame and in focus</li>
                <li>Avoid shadows across the text</li>
                <li>For multi-page letters, add each page as a separate photo</li>
              </ul>
            </div>
          </>
        ) : pdf ? (
          /* PDF selected */
          <>
            <p className="text-sm text-warmstone-600">
              PDF ready. Tap Continue to extract the data.
            </p>
            <div className="relative rounded-xl overflow-hidden border border-warmstone-200 bg-warmstone-50">
              <div className="aspect-video flex flex-col items-center justify-center gap-3">
                <Upload size={40} className="text-warmstone-400" />
                <p className="text-sm font-semibold text-warmstone-700">{pdf.name}</p>
                <p className="text-xs text-warmstone-400">PDF document · {(pdf.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-warmstone-900/60 text-warmstone-white rounded-full p-1.5 hover:bg-warmstone-900/80 transition-colors"
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          </>
        ) : (
          /* Images selected */
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-warmstone-700 font-semibold">
                {images.length} {images.length === 1 ? "page" : "pages"} added
              </p>
              {canAddMore && (
                <p className="text-xs text-warmstone-400">Up to {MAX_PAGES} pages</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-warmstone-200 aspect-[3/4] bg-warmstone-50">
                  <img src={img.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-warmstone-900/60 text-warmstone-white text-[10px] font-bold rounded px-1.5 py-0.5">
                    {i + 1}
                  </div>
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-warmstone-900/60 text-warmstone-white rounded-full p-1 hover:bg-warmstone-900/80 transition-colors"
                    aria-label={`Remove page ${i + 1}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {canAddMore && (
                <button
                  onClick={() => addMoreInputRef.current?.click()}
                  className="aspect-[3/4] rounded-lg border-2 border-dashed border-warmstone-200 hover:border-honey-300 hover:bg-honey-50 transition-colors flex flex-col items-center justify-center gap-1 text-warmstone-400 hover:text-honey-600"
                >
                  <Plus size={20} />
                  <span className="text-[10px] font-semibold">Add page</span>
                </button>
              )}
            </div>

            <input
              ref={addMoreInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleImageSelected}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-warmstone-100 px-4 py-4 flex gap-3">
        <Button variant="ghost" onClick={hasSelection ? handleClear : onCancel} fullWidth>
          {hasSelection ? "Start over" : "Cancel"}
        </Button>
        <Button fullWidth onClick={handleContinue} disabled={!hasSelection}>
          <ScanLine size={16} />
          {images.length > 1 ? `Scan ${images.length} pages` : "Continue"}
        </Button>
      </div>
    </div>
  );
}
