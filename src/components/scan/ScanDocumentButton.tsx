"use client";

import { useState } from "react";
import { Gem } from "lucide-react";
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
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-warmstone-400 leading-snug text-right max-w-[130px]">
          Letters, prescriptions, medicine labels&nbsp;&amp; more
        </p>
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2 bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)] transition-colors rounded-md px-4 py-2.5 text-sm min-h-[44px] cursor-pointer shrink-0"
        >
          <Gem size={15} />
          AI scan
        </button>
      </div>
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
