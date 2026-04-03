"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, CalendarDays, Mail, BookOpen, Menu, X,
  Settings, Shield, ChevronDown, Check, Plus, Lock, LogOut,
  Zap, Sparkles, Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useUserType } from "@/lib/context/UserTypeContext";

type TrialWidgetState =
  | { kind: "expiring"; daysLeft: number }
  | { kind: "ended" }
  | null;

function computeTrialWidget(
  plan: string | null,
  subscriptionStatus: string | null,
  trialEndsAt: string | null,
): TrialWidgetState {
  if (plan === "free") return { kind: "ended" };
  if (subscriptionStatus === "trial" && trialEndsAt) {
    const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 7 && daysLeft > 0) return { kind: "expiring", daysLeft };
    if (daysLeft <= 0) return { kind: "ended" };
  }
  return null;
}

interface HouseholdOption {
  id: string;
  name: string;
  is_locked: boolean;
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { labels } = useUserType();

  const [isAdmin, setIsAdmin] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [trialWidget, setTrialWidget] = useState<TrialWidgetState>(null);
  const [aiUsage, setAiUsage] = useState<{ used: number | null; limit: number | null } | null>(null);

  // Extract household from current path
  const householdMatch = pathname.match(/^\/household\/([^/]+)/);
  const currentHouseholdId = householdMatch ? householdMatch[1] : null;

  // Remember last visited household so Calendar tab works from any page
  const [lastHouseholdId, setLastHouseholdId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("carebee_last_household") ?? null;
  });

  useEffect(() => {
    if (currentHouseholdId) {
      localStorage.setItem("carebee_last_household", currentHouseholdId);
      setLastHouseholdId(currentHouseholdId);
    }
  }, [currentHouseholdId]);

  const effectiveHouseholdId = currentHouseholdId ?? lastHouseholdId;
  const calendarHref = effectiveHouseholdId
    ? `/household/${effectiveHouseholdId}/calendar`
    : "/dashboard";

  // Load admin status + household list + trial/AI data once
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, plan")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.account_type === "admin") setIsAdmin(true);

      // Trial widget — only for non-admin/tester
      if (profile && profile.account_type !== "admin" && profile.account_type !== "tester") {
        const plan = (profile as { plan?: string | null }).plan ?? null;
        if (plan === "free") {
          setTrialWidget({ kind: "ended" });
        } else {
          const { data: membership } = await supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", user.id)
            .eq("role", "owner")
            .maybeSingle();
          if (membership) {
            const { data: hh } = await supabase
              .from("households")
              .select("subscription_status, trial_ends_at")
              .eq("id", membership.household_id)
              .maybeSingle();
            if (hh) {
              setTrialWidget(computeTrialWidget(
                plan,
                hh.subscription_status,
                (hh as { trial_ends_at?: string | null }).trial_ends_at ?? null,
              ));
            }
          }
        }
      }

      // Household list
      supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .then(({ data: memberships }) => {
          if (!memberships?.length) return;
          const ids = memberships.map((m) => m.household_id as string);
          supabase
            .from("households")
            .select("id, name, is_locked")
            .in("id", ids)
            .order("name")
            .then(({ data: hh }) => {
              if (hh) setHouseholds(hh as HouseholdOption[]);
            });
        });
    });

    // AI usage
    fetch("/api/ai-usage")
      .then((r) => r.json())
      .then((data: { used: number | null; limit: number | null }) => setAiUsage(data))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close More sheet on route change
  useEffect(() => {
    setMoreOpen(false);
    setSwitcherOpen(false);
  }, [pathname]);

  // Close switcher on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node))
        setSwitcherOpen(false);
    }
    if (switcherOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [switcherOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const currentHousehold = households.find((h) => h.id === effectiveHouseholdId);

  const careActive =
    pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/household/") && !pathname.includes("/calendar"));
  const calendarActive = pathname.includes("/calendar");
  const updatesActive = pathname.startsWith("/updates");
  const lettersActive = pathname.startsWith("/letters-vault");
  const moreActive =
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/contact");

  const TAB =
    "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors relative";

  return (
    <>
      {/* Backdrop — z-30 so the tab bar (z-40) stays tappable */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More sheet — sits directly above the tab bar */}
      <div
        className={[
          "md:hidden fixed left-0 right-0 z-50 bg-warmstone-white rounded-t-2xl shadow-2xl border-t border-warmstone-100 transition-transform duration-300",
          moreOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ bottom: 0 }}
      >
        <div
          className="px-4 pt-3"
          style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}
        >
          {/* Drag handle */}
          <div className="w-10 h-1 bg-warmstone-200 rounded-full mx-auto mb-4" />

          {/* Plan / AI status — quiet info block, only shown when relevant */}
          {(trialWidget || (aiUsage && aiUsage.limit !== null && aiUsage.used !== null)) && (
            <div className="mb-4 flex flex-col gap-2">
              {/* AI usage bar */}
              {aiUsage && aiUsage.limit !== null && aiUsage.used !== null && (() => {
                const remaining = aiUsage.limit - aiUsage.used;
                const depleted = remaining <= 0;
                const low = remaining === 1;
                // green = 2+ left, amber = 1 left, grey = 0 left
                const cardCls = depleted
                  ? "bg-warmstone-50 border-warmstone-200"
                  : low
                  ? "bg-amber-50 border-amber-200"
                  : "bg-green-50 border-green-200";
                const textCls = depleted
                  ? "text-warmstone-500"
                  : low
                  ? "text-amber-700"
                  : "text-green-700";
                const barCls = depleted
                  ? "bg-warmstone-300"
                  : low
                  ? "bg-amber-400"
                  : "bg-green-500";
                const pct = aiUsage.used / aiUsage.limit;
                return (
                  <div className={`px-3 py-2.5 rounded-xl border text-xs ${cardCls}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`flex items-center gap-1.5 font-semibold ${textCls}`}>
                        <Zap size={12} className="shrink-0" />
                        AI uses this month
                      </span>
                      <span className={`font-bold tabular-nums ${textCls}`}>
                        {aiUsage.used}/{aiUsage.limit}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-warmstone-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barCls}`}
                        style={{ width: `${Math.min(100, pct * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Trial status */}
              {trialWidget && (
                <Link
                  href="/settings"
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                    trialWidget.kind === "ended"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-honey-50 border-honey-200 text-honey-800"
                  }`}
                >
                  {trialWidget.kind === "ended"
                    ? <Sparkles size={13} className="shrink-0" />
                    : <Clock size={13} className="shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">
                      {trialWidget.kind === "ended"
                        ? "Trial ended"
                        : trialWidget.daysLeft === 1
                        ? "Trial ends tomorrow"
                        : `${trialWidget.daysLeft} days left`}
                    </p>
                    <p className="opacity-75 leading-tight mt-0.5">
                      {trialWidget.kind === "ended" ? "Subscribe to restore AI access" : "Subscribe to keep AI access"}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Care record switcher */}
          {effectiveHouseholdId && households.length > 0 && labels.showCareRecordSwitcher && (
            <div ref={switcherRef} className="relative mb-4">
              <button
                onClick={() => setSwitcherOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-warmstone-50 border border-warmstone-200 text-sm font-semibold text-warmstone-800 min-h-[44px]"
              >
                <span className="flex-1 text-left truncate">
                  {currentHousehold?.name ?? "Select care record"}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-warmstone-400 transition-transform ${switcherOpen ? "rotate-180" : ""}`}
                />
              </button>
              {switcherOpen && (
                <div className="absolute left-0 right-0 bottom-full mb-1 bg-warmstone-white border border-warmstone-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {households.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSwitcherOpen(false);
                        setMoreOpen(false);
                        router.push(`/household/${h.id}`);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-warmstone-800 hover:bg-warmstone-50 transition-colors text-left"
                    >
                      <span className="flex-1 truncate">{h.name}</span>
                      {h.is_locked && (
                        <Lock size={12} className="shrink-0 text-amber-500" />
                      )}
                      {h.id === effectiveHouseholdId && (
                        <Check size={14} className="shrink-0 text-sage-500" />
                      )}
                    </button>
                  ))}
                  {labels.showNewCareRecordButton && (
                    <div className="border-t border-warmstone-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setSwitcherOpen(false);
                          setMoreOpen(false);
                          router.push("/household/new");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-honey-700 hover:bg-honey-50 transition-colors"
                      >
                        <Plus size={14} className="shrink-0" />
                        New care record
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Menu items */}
          <div className="flex flex-col gap-1">
            <Link
              href="/settings"
              className={[
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-honey-50 text-honey-800"
                  : "text-warmstone-700 hover:bg-warmstone-50",
              ].join(" ")}
            >
              <Settings size={18} />
              Settings
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={[
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-honey-50 text-honey-800"
                    : "text-warmstone-700 hover:bg-warmstone-50",
                ].join(" ")}
              >
                <Shield size={18} />
                Admin
              </Link>
            )}
            <Link
              href="/contact"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-warmstone-700 hover:bg-warmstone-50 transition-colors"
            >
              <Mail size={18} />
              Contact us
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-warmstone-600 hover:bg-warmstone-50 transition-colors w-full text-left"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-warmstone-white border-t border-warmstone-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {/* Care */}
          <Link href="/dashboard" className={`${TAB} ${careActive ? "text-honey-600" : "text-warmstone-400"}`}>
            {careActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#E8A817" }} />
            )}
            <Home size={22} />
            <span className="text-xs font-semibold">Care</span>
          </Link>

          {/* Calendar */}
          <Link href={calendarHref} className={`${TAB} ${calendarActive ? "text-honey-600" : "text-warmstone-400"}`}>
            {calendarActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#E8A817" }} />
            )}
            <CalendarDays size={22} />
            <span className="text-xs font-semibold">Calendar</span>
          </Link>

          {/* Updates */}
          <Link href="/updates" className={`${TAB} ${updatesActive ? "text-honey-600" : "text-warmstone-400"}`}>
            {updatesActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#E8A817" }} />
            )}
            <Mail size={22} />
            <span className="text-xs font-semibold">Updates</span>
          </Link>

          {/* Letters */}
          <Link href="/letters-vault" className={`${TAB} ${lettersActive ? "text-honey-600" : "text-warmstone-400"}`}>
            {lettersActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#E8A817" }} />
            )}
            <BookOpen size={22} />
            <span className="text-xs font-semibold">Letters</span>
          </Link>

          {/* More */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`${TAB} ${moreOpen || moreActive ? "text-honey-600" : "text-warmstone-400"}`}
          >
            {(moreOpen || moreActive) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: "#E8A817" }} />
            )}
            <span className="relative">
              {moreOpen ? <X size={22} /> : <Menu size={22} />}
              {/* Amber dot — only when trial ended or AI at limit */}
              {!moreOpen && (trialWidget?.kind === "ended" || (aiUsage?.limit != null && aiUsage?.used != null && aiUsage.used >= aiUsage.limit)) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-warmstone-white" />
              )}
            </span>
            <span className="text-xs font-semibold">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
