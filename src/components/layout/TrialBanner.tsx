import { Sparkles, Clock } from "lucide-react";
import Link from "next/link";

interface TrialBannerProps {
  memberRole: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  profilePlan: string | null;
}

/**
 * Shown to the household owner when their trial is expiring soon or has ended.
 * - plan='free' override: always shows "access ended" regardless of household trial date
 * - Trial expiring in 1-7 days: amber warning
 * - Trial expired (date past, awaiting cron): red prompt to upgrade
 * - Free plan with no trial ever started: not shown (UpgradeModal handles per-feature)
 * Editors and viewers see nothing.
 */
export function TrialBanner({ memberRole, subscriptionStatus, trialEndsAt, profilePlan }: TrialBannerProps) {
  if (memberRole !== "owner") return null;

  // plan='free' means access was explicitly revoked — show expired banner regardless of household trial date
  if (profilePlan === "free") {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
        <Sparkles size={16} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-red-900">Your trial has ended.</p>
          <p className="text-red-700 mt-0.5">AI features are now unavailable. Subscribe to restore access.</p>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
        >
          <Sparkles size={13} />
          Subscribe
        </Link>
      </div>
    );
  }

  if (subscriptionStatus !== "trial") return null;
  if (!trialEndsAt) return null;

  const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysLeft > 7) return null;

  if (daysLeft > 0) {
    return (
      <div className="flex items-start gap-3 bg-honey-50 border border-honey-200 rounded-lg px-4 py-3 mb-4 text-sm">
        <Clock size={16} className="text-honey-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-warmstone-900">
            {daysLeft === 1 ? "Your trial ends tomorrow." : `Your trial ends in ${daysLeft} days.`}
          </p>
          <p className="text-warmstone-600 mt-0.5">Subscribe to keep access to AI features after your trial.</p>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-1.5 rounded-md bg-honey-100 hover:bg-honey-200 text-honey-800 transition-colors"
        >
          <Sparkles size={13} />
          See plans
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
      <Sparkles size={16} className="text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-red-900">Your trial has ended.</p>
        <p className="text-red-700 mt-0.5">AI features are now unavailable. Subscribe to restore access.</p>
      </div>
      <Link
        href="/settings"
        className="flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
      >
        <Sparkles size={13} />
        Subscribe
      </Link>
    </div>
  );
}
