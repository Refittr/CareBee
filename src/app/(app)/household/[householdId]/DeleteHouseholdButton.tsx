"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";

export function DeleteHouseholdButton({ householdId, householdName }: { householdId: string; householdName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/households/${householdId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-warmstone-400 hover:text-error transition-colors flex items-center gap-1.5"
      >
        <Trash2 size={14} />
        Delete care record
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-warmstone-white rounded-xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-error shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-warmstone-900 text-sm">Delete &quot;{householdName}&quot;?</p>
                <p className="text-sm text-warmstone-600 mt-1 leading-relaxed">
                  This will permanently delete the care record and everything in it, including all people, medical data, documents, and letters. This cannot be undone.
                </p>
              </div>
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setOpen(false); setError(null); }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-warmstone-600 hover:text-warmstone-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-bold bg-error text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Yes, delete it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
