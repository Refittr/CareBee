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
  const { hasAccess } = useAIAccess(householdId);

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
        className="w-full flex items-center gap-3 bg-sage-50 hover:bg-sage-100 border border-sage-200 text-warmstone-900 rounded-xl p-4 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sage-100 shrink-0">
          <Sparkles size={18} className="text-sage-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug">Scan a document with AI</p>
          <p className="text-xs text-warmstone-500 mt-0.5 leading-snug">
            Letters, prescriptions, test results and more. CareBee reads it and files the details automatically.
          </p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-warmstone-400" />
      </button>

      <ScanModal
        open={open}
        onClose={() => setOpen(false)}
        householdId={householdId}
        personId={personId}
      />
      <UpgradeModal householdId={householdId} open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}
