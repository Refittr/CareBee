"use client";

import { Sparkles } from "lucide-react";

export function ScanNudge({ onScan }: { onScan: () => void }) {
  return (
    <button
      onClick={onScan}
      className="w-full flex items-center gap-3 bg-sage-50 border border-sage-200 rounded-xl p-4 text-left hover:bg-sage-100 transition-colors"
    >
      <div className="shrink-0 p-2 rounded-lg bg-sage-100">
        <Sparkles size={16} className="text-sage-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-sage-900">Have a letter, prescription or hospital document?</p>
        <p className="text-xs text-sage-600 mt-0.5">Scan it with AI and we will add the details to this record automatically.</p>
      </div>
    </button>
  );
}
