"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";
import { ScanModal } from "./ScanModal";

interface ScanDocumentButtonProps {
  householdId: string;
  personId: string;
}

export function ScanDocumentButton({ householdId, personId }: ScanDocumentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)] transition-colors rounded-md px-4 py-2.5 text-sm min-h-[44px] cursor-pointer"
      >
        <ScanLine size={16} />
        Scan a document
      </button>
      <ScanModal
        open={open}
        onClose={() => setOpen(false)}
        householdId={householdId}
        personId={personId}
      />
    </>
  );
}
