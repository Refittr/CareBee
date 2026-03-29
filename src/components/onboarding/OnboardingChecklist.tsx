"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { CheckCircle, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { backfillExistingSteps } from "@/lib/utils/checklist";

interface ChecklistRow {
  step_key: string;
  completed_at: string | null;
}

interface StepDef {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  celebrationMessage: string;
}

interface Props {
  userType: "self_care" | "carer";
  householdId: string;
  personId: string;
}

const STORAGE_KEY = "carebee_onboarding_collapsed";

function getSteps(
  userType: "self_care" | "carer",
  householdId: string,
  personId: string,
): StepDef[] {
  const base = `/household/${householdId}/people/${personId}`;

  if (userType === "self_care") {
    return [
      {
        key: "add_profile",
        title: "Set up your health profile",
        subtitle: "Add your name and a few basic details to your health record",
        href: `${base}`,
        celebrationMessage: "Great start. Your record is ready.",
      },
      {
        key: "add_first_condition_or_med",
        title: "Add a condition or medication",
        subtitle: "Start building your record with something you are managing right now",
        href: `${base}/conditions`,
        celebrationMessage: "That is now part of your record.",
      },
      {
        key: "scan_first_document",
        title: "Scan a letter or prescription",
        subtitle: "Photograph a document and let the AI read it into your record",
        href: `${base}`,
        celebrationMessage: "The AI has added that to your record.",
      },
    ];
  }

  return [
    {
      key: "add_person",
      title: "Add the person you care for",
      subtitle: "Enter their basic details to start their care record",
      href: `/household/${householdId}/people/new`,
      celebrationMessage: "Great start. Their record is ready.",
    },
    {
      key: "add_first_condition_or_med",
      title: "Add a condition or medication",
      subtitle: "Start with something they are currently being treated for",
      href: `${base}/conditions`,
      celebrationMessage: "That is now part of the record.",
    },
    {
      key: "scan_first_document",
      title: "Scan a letter or prescription",
      subtitle: "Photograph a document and the AI will read it into the record",
      href: `${base}`,
      celebrationMessage: "The AI has added that to the record.",
    },
    {
      key: "invite_family",
      title: "Invite a family member (optional)",
      subtitle: "Share the care record so everyone sees the same information",
      href: `/household/${householdId}/invite`,
      celebrationMessage: "Invite sent. They will get an email shortly.",
    },
  ];
}

export function OnboardingChecklist({ userType, householdId, personId }: Props) {
  const supabase = createClient();
  const [rows, setRows] = useState<ChecklistRow[] | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [dismissConfirm, setDismissConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [recentlyCompleted, setRecentlyCompleted] = useState<string | null>(null);
  const [allDoneShown, setAllDoneShown] = useState(false);
  const prevRowsRef = useRef<ChecklistRow[] | null>(null);

  // Initialise collapsed from localStorage (client only)
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("onboarding_checklist")
      .select("step_key, completed_at");
    if (!data) return;
    setRows(data);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch when window regains focus (user returns after completing an action)
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [load]);

  // Detect newly completed steps to show celebration message
  useEffect(() => {
    if (!rows) return;
    if (!prevRowsRef.current) {
      // First load — backfill any steps already satisfied by existing data,
      // then reload so the UI reflects the updated state
      prevRowsRef.current = rows;
      backfillExistingSteps(userType, householdId, personId).then(() => load());
      return;
    }
    const prev = prevRowsRef.current;
    const newlyDone = rows.find(
      (r) => r.completed_at && !prev.find((p) => p.step_key === r.step_key)?.completed_at,
    );
    // Always advance the ref so the same step doesn't re-trigger
    prevRowsRef.current = rows;
    if (newlyDone) {
      setRecentlyCompleted(newlyDone.step_key);
      const t = setTimeout(() => setRecentlyCompleted(null), 3000);
      return () => clearTimeout(t);
    }
  }, [rows, userType, householdId, personId]);

  // All-done celebration
  useEffect(() => {
    if (!rows || allDoneShown) return;
    const allComplete = rows.length > 0 && rows.every((r) => r.completed_at);
    if (allComplete) {
      setAllDoneShown(true);
      const t = setTimeout(async () => {
        await dismissChecklist();
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [rows, allDoneShown]); // eslint-disable-line react-hooks/exhaustive-deps

  async function dismissChecklist() {
    setDismissed(true);
    await supabase
      .from("profiles")
      .update({ onboarding_dismissed: true })
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
  }

  function toggleCollapse(next: boolean) {
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  if (dismissed || rows === null) return null;

  const steps = getSteps(userType, householdId, personId);
  const completedCount = rows.filter((r) => r.completed_at).length;
  const total = steps.length;
  const allComplete = completedCount === total && total > 0;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Find the celebration message for the most recently completed step
  const celebrationStep = recentlyCompleted
    ? steps.find((s) => s.key === recentlyCompleted)
    : null;

  return (
    <div className="border border-warmstone-200 rounded-xl bg-warmstone-white mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-sm font-bold text-warmstone-900">
              {allComplete ? "You are all set!" : `${completedCount} of ${total} complete`}
            </span>
            {allComplete && (
              <span className="text-xs text-sage-600 font-semibold">CareBee is ready to go.</span>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-warmstone-100 rounded-full w-full max-w-xs">
            <div
              className="h-full rounded-full bg-honey-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {celebrationStep && (
            <p className="text-xs text-sage-600 font-semibold mt-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {celebrationStep.celebrationMessage}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <button
            type="button"
            onClick={() => toggleCollapse(!collapsed)}
            className="p-1.5 rounded hover:bg-warmstone-100 transition-colors text-warmstone-500 hover:text-warmstone-700"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setDismissConfirm(true)}
            className="p-1.5 rounded hover:bg-warmstone-100 transition-colors text-warmstone-400 hover:text-warmstone-600"
            aria-label="Dismiss checklist"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Dismiss confirmation */}
      {dismissConfirm && (
        <div className="px-5 pb-4 flex items-center gap-3 border-t border-warmstone-100 pt-3">
          <p className="text-sm text-warmstone-700 flex-1">
            Hide this checklist? You can always find these features in the menu.
          </p>
          <button
            type="button"
            onClick={dismissChecklist}
            className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors"
          >
            Hide
          </button>
          <button
            type="button"
            onClick={() => setDismissConfirm(false)}
            className="text-sm font-semibold text-warmstone-600 hover:text-warmstone-800 transition-colors"
          >
            Keep
          </button>
        </div>
      )}

      {/* Steps */}
      {!collapsed && !dismissConfirm && (
        <ul className="border-t border-warmstone-100">
          {steps.map((step, idx) => {
            const row = rows.find((r) => r.step_key === step.key);
            const isComplete = !!row?.completed_at;
            // First incomplete step gets the accent highlight
            const firstIncompleteIdx = steps.findIndex(
              (s) => !rows.find((r) => r.step_key === s.key)?.completed_at,
            );
            const isNext = !isComplete && idx === firstIncompleteIdx;
            const justDone = recentlyCompleted === step.key;

            return (
              <li
                key={step.key}
                className={`border-b border-warmstone-100 last:border-0 transition-colors ${
                  isNext ? "border-l-2 border-l-honey-400" : ""
                } ${justDone ? "bg-sage-50" : ""}`}
              >
                {isComplete ? (
                  <div className="flex items-start gap-3 px-5 py-3.5 cursor-default">
                    <CheckCircle
                      size={18}
                      className={`shrink-0 mt-0.5 transition-colors ${justDone ? "text-sage-500" : "text-warmstone-300"}`}
                    />
                    <div>
                      <p className="text-sm text-warmstone-400 line-through">{step.title}</p>
                      <p className="text-xs text-warmstone-300 mt-0.5">{step.subtitle}</p>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={step.href}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-warmstone-50 transition-colors"
                  >
                    <Circle
                      size={18}
                      className={`shrink-0 mt-0.5 ${isNext ? "text-honey-400" : "text-warmstone-300"}`}
                    />
                    <div>
                      <p className={`text-sm ${isNext ? "font-semibold text-warmstone-900" : "text-warmstone-600"}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-warmstone-500 mt-0.5">{step.subtitle}</p>
                    </div>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
