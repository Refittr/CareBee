"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { useUserType } from "@/lib/context/UserTypeContext";

interface Props {
  personId: string;
  householdId: string;
  firstName: string;
  enabled: boolean;
  baseUrl: string;
  openFollowUpCount?: number;
}

export function DailyCareEnableCard({ personId, householdId, firstName, enabled, baseUrl, openFollowUpCount = 0 }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { labels } = useUserType();

  async function handleEnable() {
    setLoading(true);
    await supabase.from("people").update({ daily_care_enabled: true }).eq("id", personId);
    router.refresh();
    setLoading(false);
  }

  if (enabled) {
    return (
      <Link href={`${baseUrl}/daily-care`} className="block h-full">
        <Card hoverable clickable className="p-5 h-full">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={18} className="text-honey-600" />
            <h2 className="font-bold text-warmstone-900">Daily care records</h2>
          </div>
          {openFollowUpCount > 0 ? (
            <div className="flex items-center gap-1.5 mt-1 mb-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">
                {openFollowUpCount} open follow-up{openFollowUpCount !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-warmstone-500">
              {labels.dailyCareTrackDescription.replace("{firstName}", firstName)}
            </p>
          )}
          <p className="text-xs text-honey-600 font-semibold mt-3">View daily care records →</p>
        </Card>
      </Link>
    );
  }

  return (
    <div>
      <Card className="p-5 border-dashed">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={18} className="text-warmstone-400" />
              <h2 className="font-bold text-warmstone-700">Daily care records</h2>
            </div>
            <p className="text-sm text-warmstone-500 max-w-md">
              {labels.dailyCareEnableDescription.replace("{firstName}", firstName)}
            </p>
          </div>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="shrink-0 px-4 py-2 text-sm font-bold bg-honey-400 text-white rounded-md hover:bg-honey-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Turning on..." : "Turn on"}
          </button>
        </div>
      </Card>
    </div>
  );
}

