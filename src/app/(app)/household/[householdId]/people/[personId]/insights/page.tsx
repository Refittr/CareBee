"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Lightbulb, RefreshCw, CheckCircle, X, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateTime } from "@/lib/utils/dates";
import { hasCareRecordPremiumAccess } from "@/lib/permissions";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import type { HealthInsight } from "@/lib/types/database";

const categoryLabels: Record<string, string> = {
  missing_check: "NICE guidelines",
  overdue_review: "Overdue review",
  test_trend: "Test trend",
  interaction_risk: "Interaction risk",
  care_suggestion: "Care suggestion",
  benefit_hint: "Benefit",
  medication_review: "Medication review",
  care_gap: "Care gap",
  general: "General",
};

const priorityConfig = {
  urgent: { border: "border-l-error", badge: "bg-red-100 text-error", label: "Urgent" },
  important: { border: "border-l-honey-400", badge: "bg-honey-50 text-honey-800", label: "Important" },
  info: { border: "border-l-sage-400", badge: "bg-sage-50 text-sage-700", label: "Info" },
};

const ONE_HOUR_MS = 60 * 60 * 1000;

export default function InsightsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [dismissed, setDismissed] = useState<HealthInsight[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [personName, setPersonName] = useState("");

  const canCheckNow = !lastChecked || Date.now() - new Date(lastChecked).getTime() > ONE_HOUR_MS;

  const loadFromDB = useCallback(async () => {
    const [{ data: ins }, { data: dis }, { data: check }, { data: person }] = await Promise.all([
      supabase.from("health_insights").select("*").eq("person_id", personId).eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("health_insights").select("*").eq("person_id", personId).in("status", ["dismissed", "resolved"]).order("created_at", { ascending: false }),
      supabase.from("insight_checks").select("checked_at").eq("person_id", personId).order("checked_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("people").select("first_name, last_name").eq("id", personId).single(),
    ]);
    setInsights(ins ?? []);
    setDismissed(dis ?? []);
    if (check) setLastChecked(check.checked_at);
    if (person) setPersonName(`${person.first_name} ${person.last_name}`);
  }, [personId, supabase]);

  const generate = useCallback(async (manual = false) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, household_id: householdId, manual }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error === "Premium required") {
          setIsPremium(false);
        }
        return;
      }
      setInsights(data.insights ?? []);
      if (data.lastChecked) setLastChecked(data.lastChecked);
      if (manual && data.generated) {
        const count = data.newCount ?? 0;
        addToast(count > 0 ? `Found ${count} new insight${count === 1 ? "" : "s"}.` : "No new insights found.", "success");
      }
    } catch {
      if (manual) addToast("Could not check insights. Please try again.", "error");
    } finally {
      setGenerating(false);
    }
  }, [personId, householdId, addToast]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      // Check premium
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [{ data: profile }, { data: household }] = await Promise.all([
          supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle(),
          supabase.from("households").select("subscription_status, trial_ends_at").eq("id", householdId).maybeSingle(),
        ]);
        const premium = profile && household ? hasCareRecordPremiumAccess(household, profile) : false;
        setIsPremium(premium);
        if (premium) {
          await loadFromDB();
          // Auto-generate if never checked or stale (7 days)
          const { data: lastCheckRow } = await supabase
            .from("insight_checks")
            .select("checked_at")
            .eq("person_id", personId)
            .order("checked_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const shouldAutoGenerate = !lastCheckRow ||
            Date.now() - new Date(lastCheckRow.checked_at).getTime() > 7 * 24 * 60 * 60 * 1000;
          if (shouldAutoGenerate) {
            generate(false);
          }
        }
      }
      setLoading(false);
    }
    init();
  }, [personId]);

  async function updateStatus(id: string, status: "dismissed" | "resolved") {
    const field = status === "dismissed" ? "dismissed_at" : "resolved_at";
    await supabase.from("health_insights").update({ status, [field]: new Date().toISOString() }).eq("id", id);
    await loadFromDB();
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;

  if (!isPremium) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4 max-w-sm mx-auto">
          <Lightbulb size={48} className="text-warmstone-300" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-warmstone-900">Health Insights is a premium feature</h2>
          <p className="text-sm text-warmstone-600 leading-relaxed">
            Get personalised health insights, NICE guideline checks, and care gap detection. Upgrade this care record to unlock.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="inline-flex items-center gap-2 bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 transition-colors rounded-lg px-5 py-2.5 text-sm min-h-[44px]"
          >
            <Sparkles size={15} /> See what&apos;s included
          </button>
        </div>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </>
    );
  }

  const urgent = insights.filter((i) => i.priority === "urgent");
  const important = insights.filter((i) => i.priority === "important");
  const info = insights.filter((i) => i.priority === "info");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-warmstone-900 text-lg">Health Insights</h2>
          {lastChecked && (
            <p className="text-xs text-warmstone-400 mt-0.5">
              Last checked: {formatDateTime(lastChecked)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {insights.length > 0 && (
            <span className="bg-honey-50 text-honey-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {insights.length} active
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            loading={generating}
            disabled={!canCheckNow || generating}
            title={!canCheckNow ? "Can check once per hour" : "Check for new insights"}
            onClick={() => generate(true)}
          >
            <RefreshCw size={14} />
            Check now
          </Button>
        </div>
      </div>

      {/* Generating state */}
      {generating && (
        <div className="bg-honey-50 border border-honey-200 rounded-lg p-4 flex items-center gap-3">
          <RefreshCw size={16} className="text-honey-800 animate-spin" />
          <p className="text-sm text-honey-800">
            Reviewing {personName || "their"} record...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!generating && insights.length === 0 && (
        <EmptyState
          icon={Lightbulb}
          heading="No insights right now"
          description="We will check again soon and let you know if anything comes up. You can also press Check now to run a check immediately."
        />
      )}

      {/* Insight groups */}
      {[
        { items: urgent, priority: "urgent" as const },
        { items: important, priority: "important" as const },
        { items: info, priority: "info" as const },
      ].map(({ items, priority }) =>
        items.map((insight) => {
          const cfg = priorityConfig[priority];
          return (
            <Card key={insight.id} className={`p-5 border-l-4 ${cfg.border}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-warmstone-400 px-2 py-0.5 rounded-full bg-warmstone-50">
                    {categoryLabels[insight.category] ?? insight.category}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-warmstone-900 mb-1">{insight.title}</h3>
              <p className="text-sm text-warmstone-700 leading-relaxed mb-3">{insight.description}</p>
              {insight.source_data && Object.keys(insight.source_data).length > 0 && (
                <p className="text-xs text-warmstone-400 mb-3">
                  {Object.entries(insight.source_data)
                    .filter(([k]) => ["condition", "guideline", "last_test_date", "last_test_value"].includes(k))
                    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                    .join(", ")}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateStatus(insight.id, "resolved")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-md transition-colors min-h-[36px]"
                >
                  <CheckCircle size={14} />
                  Resolved
                </button>
                <button
                  onClick={() => updateStatus(insight.id, "dismissed")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-warmstone-500 hover:text-warmstone-800 bg-warmstone-50 hover:bg-warmstone-100 px-3 py-1.5 rounded-md transition-colors min-h-[36px]"
                >
                  <X size={14} />
                  Dismiss
                </button>
              </div>
            </Card>
          );
        })
      )}

      {/* Dismissed / resolved toggle */}
      {dismissed.length > 0 && (
        <div>
          <button
            onClick={() => setShowDismissed((s) => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-warmstone-500 hover:text-warmstone-800 transition-colors min-h-[44px]"
          >
            {showDismissed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showDismissed ? "Hide" : "Show"} dismissed and resolved ({dismissed.length})
          </button>
          {showDismissed && (
            <div className="flex flex-col gap-3 mt-3">
              {dismissed.map((insight) => (
                <Card key={insight.id} className="p-4 opacity-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-warmstone-400 px-2 py-0.5 rounded-full bg-warmstone-50 capitalize">
                      {insight.status}
                    </span>
                    <span className="text-xs text-warmstone-400">
                      {categoryLabels[insight.category] ?? insight.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-warmstone-700 text-sm">{insight.title}</h3>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
