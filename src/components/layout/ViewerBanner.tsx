"use client";

import { Eye } from "lucide-react";
import { useRole } from "@/lib/context/role";

export function ViewerBanner() {
  const role = useRole();
  if (role !== "viewer") return null;

  return (
    <div className="flex items-center gap-2 bg-warmstone-100 border border-warmstone-200 rounded-lg px-3 py-2 mb-4 text-xs font-semibold text-warmstone-600">
      <Eye size={14} className="shrink-0" />
      You are viewing this care record in read-only mode.
    </div>
  );
}
