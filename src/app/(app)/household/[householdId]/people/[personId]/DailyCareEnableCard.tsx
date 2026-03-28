"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";

interface Props {
  personId: string;
  householdId: string;
  firstName: string;
  enabled: boolean;
  baseUrl: string;
}

export function DailyCareEnableCard({ personId, householdId, firstName, enabled, baseUrl }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    await supabase.from("people").update({ daily_care_enabled: true }).eq("id", personId);
    router.refresh();
    setLoading(false);
  }

  if (enabled) {
    return (
      <Link href={`${baseUrl}/daily-care`} className="md:col-span-2">
        <Card hoverable clickable className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={18} className="text-honey-600" />
            <h2 className="font-bold text-warmstone-900">Daily care records</h2>
          </div>
          <p className="text-sm text-warmstone-500">Track {firstName}&apos;s daily wellbeing, meals, medication and more.</p>
          <p className="text-xs text-honey-600 font-semibold mt-3">View daily care records →</p>
        </Card>
      </Link>
    );
  }

  return (
    <div className="md:col-span-2">
      <Card className="p-5 border-dashed">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={18} className="text-warmstone-400" />
              <h2 className="font-bold text-warmstone-700">Daily care records</h2>
            </div>
            <p className="text-sm text-warmstone-500 max-w-md">
              Keep a shift-by-shift log of {firstName}&apos;s day: mood, meals, medication, mobility and more. Useful when multiple carers are involved or when you want a detailed picture over time.
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
