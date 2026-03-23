"use client";

import { Pencil, ChevronUp, AlertTriangle } from "lucide-react";
import type { ScanConfidence } from "@/lib/types/scan";

interface ReviewCardProps {
  checked: boolean;
  onToggle: () => void;
  confidence: ScanConfidence;
  editing: boolean;
  onEditToggle: () => void;
  isDuplicate?: boolean;
  duplicateMessage?: string;
  children: React.ReactNode;
  editContent?: React.ReactNode;
  className?: string;
}

function ConfidenceDot({ confidence }: { confidence: ScanConfidence }) {
  const classes = {
    high: "bg-sage-400",
    medium: "bg-honey-400",
    low: "bg-error",
  };
  const labels = {
    high: "High confidence",
    medium: "Medium confidence, please check",
    low: "Low confidence, please verify",
  };
  return (
    <span
      title={labels[confidence]}
      className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${classes[confidence]}`}
    />
  );
}

export function ReviewCard({
  checked,
  onToggle,
  confidence,
  editing,
  onEditToggle,
  isDuplicate,
  duplicateMessage,
  children,
  editContent,
  className = "",
}: ReviewCardProps) {
  const bg = isDuplicate
    ? "bg-honey-50 border-honey-200"
    : "bg-warmstone-white border-warmstone-100";

  return (
    <div className={`border rounded-lg overflow-hidden ${bg} ${className}`}>
      <div className="p-4 flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 w-5 h-5 rounded border-warmstone-300 accent-honey-400 shrink-0 cursor-pointer"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>

        {/* Right side: confidence dot + edit */}
        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceDot confidence={confidence} />
          {editContent && (
            <button
              onClick={onEditToggle}
              className="p-1.5 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label={editing ? "Collapse edit" : "Edit this item"}
            >
              {editing ? <ChevronUp size={16} /> : <Pencil size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Duplicate warning */}
      {isDuplicate && (
        <div className="mx-4 mb-3 flex items-start gap-2 bg-honey-100 border border-honey-200 rounded-md px-3 py-2">
          <AlertTriangle size={14} className="text-honey-700 shrink-0 mt-0.5" />
          <p className="text-xs text-honey-800">
            {duplicateMessage ?? "This item may already be in the record."}
          </p>
        </div>
      )}

      {/* Edit fields */}
      {editing && editContent && (
        <div className="border-t border-warmstone-100 px-4 py-4 bg-warmstone-50">
          {editContent}
        </div>
      )}
    </div>
  );
}
