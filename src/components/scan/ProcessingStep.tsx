"use client";

import { useEffect, useState } from "react";
import { Loader2, ScanLine } from "lucide-react";

const UPLOAD_MESSAGES = ["Uploading your document..."];

const AI_MESSAGES = [
  "Looking for medications...",
  "Checking for appointment details...",
  "Spotting conditions and diagnoses...",
  "Nearly there...",
];

interface ProcessingStepProps {
  stage: "uploading" | "reading";
}

export function ProcessingStep({ stage }: ProcessingStepProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (stage !== "reading") {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % AI_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [stage]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-12 gap-8">
      {stage === "uploading" ? (
        <>
          <Loader2 size={40} className="text-honey-400 animate-spin" />
          <div className="text-center">
            <p className="font-semibold text-warmstone-900 text-lg mb-1">
              {UPLOAD_MESSAGES[0]}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="relative">
            <ScanLine
              size={56}
              className="text-honey-400"
              style={{ animation: "pulse 2s ease-in-out infinite" }}
            />
          </div>
          <div className="text-center flex flex-col gap-2">
            <p className="font-bold text-warmstone-900 text-xl">
              Reading your document...
            </p>
            <p
              key={messageIndex}
              className="text-warmstone-500 text-sm transition-opacity duration-500"
              style={{ animation: "fadeIn 0.5s ease-in-out" }}
            >
              {AI_MESSAGES[messageIndex]}
            </p>
          </div>
          <p className="text-xs text-warmstone-400 text-center max-w-xs">
            This can take up to 20 seconds. Please keep this screen open.
          </p>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
