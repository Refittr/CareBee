import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * Shown to all members of a locked household.
 * The household owner sees a prompt to resubscribe; others see a read-only notice.
 */
export function LockedHouseholdBanner({ memberRole }: { memberRole: string }) {
  const isOwner = memberRole === "owner";

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm">
      <Lock size={16} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-amber-900">This care record is in read-only mode.</p>
        <p className="text-amber-800 mt-0.5">
          {isOwner
            ? "Your CareBee Plus plan has ended. Resubscribe to restore full access."
            : "The account owner's plan has ended. Records can be viewed but not edited."}
        </p>
      </div>
      {isOwner && (
        <Link
          href="/settings"
          className="flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-1.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
        >
          Resubscribe
        </Link>
      )}
    </div>
  );
}
