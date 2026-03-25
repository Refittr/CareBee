import { AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";

interface PastDueBannerProps {
  householdId: string;
  memberRole: string;
  subscriptionStatus: string | null;
}

/**
 * Shown to the household owner when a payment has failed and Stripe is retrying.
 * Editors and viewers see nothing — it is not their problem.
 */
export function PastDueBanner({ memberRole, subscriptionStatus }: PastDueBannerProps) {
  if (memberRole !== "owner") return null;
  if (subscriptionStatus !== "past_due") return null;

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-red-900">Your last payment did not go through.</p>
        <p className="text-red-700 mt-0.5">Please update your payment method to keep CareBee Plus.</p>
      </div>
      <Link
        href="/settings"
        className="flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
      >
        <CreditCard size={13} />
        Update payment
      </Link>
    </div>
  );
}
