"use client";

import { useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { ScanModal } from "./ScanModal";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { useAIAccess } from "@/lib/utils/access";

interface ScanDocumentButtonProps {
  householdId: string;
  personId: string;
}

export function ScanDocumentButton({ householdId, personId }: ScanDocumentButtonProps) {
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { hasAccess } = useAIAccess();

  function handleClick() {
    if (hasAccess === false) {
      setShowUpgrade(true);
    } else {
      setOpen(true);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-4 bg-honey-400 hover:bg-honey-500 active:bg-honey-600 text-warmstone-white rounded-xl p-4 shadow-[0_2px_12px_rgba(232,168,23,0.3)] transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 shrink-0">
          <Sparkles size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base leading-snug">Scan any health document with AI</p>
          <p className="text-sm text-honey-100 mt-0.5 leading-snug">
            Letters, prescriptions, medicine labels, test results &amp; more — we read it and automatically file the details in the right place.
          </p>
        </div>
        <ChevronRight size={20} className="shrink-0 opacity-70" />
      </button>

      <ScanModal
        open={open}
        onClose={() => setOpen(false)}
        householdId={householdId}
        personId={personId}
      />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}
