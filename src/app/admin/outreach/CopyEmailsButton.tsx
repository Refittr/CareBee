"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyEmailsButton({ emails, label }: { emails: string[]; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(emails.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-warmstone-200 bg-warmstone-50 text-warmstone-700 hover:bg-warmstone-100 transition-colors"
    >
      {copied ? <Check size={12} className="text-sage-500" /> : <Copy size={12} />}
      {copied ? "Copied" : label}
      <span className="ml-1 text-warmstone-400">({emails.length})</span>
    </button>
  );
}
