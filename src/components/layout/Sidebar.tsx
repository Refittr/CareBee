"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Shield, BookOpen, Settings, Mail, Bug, ChevronDown, Plus, Check, ClipboardList, Lock, Sparkles, Clock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useUserType } from "@/lib/context/UserTypeContext";

interface HouseholdOption {
  id: string;
  name: string;
  is_locked: boolean;
}

function CareRecordSwitcher({ currentHouseholdId }: { currentHouseholdId: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { labels } = useUserType();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberships } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id);
      if (!memberships?.length) return;
      const ids = memberships.map((m) => m.household_id as string);
      const { data: hh } = await supabase
        .from("households")
        .select("id, name, is_locked")
        .in("id", ids)
        .order("name");
      if (hh) {
        setHouseholds(hh as HouseholdOption[]);
        if (currentHouseholdId) {
          const current = hh.find((h) => h.id === currentHouseholdId);
          if (current) setCurrentName(current.name);
        }
      }
    }
    load();
  }, [currentHouseholdId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!currentHouseholdId || !currentName) return null;

  // Self-care users only ever have one record — show the name with no switcher
  if (!labels.showCareRecordSwitcher) {
    return (
      <div className="px-3 pb-3">
        <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md bg-warmstone-50 border border-warmstone-200 text-sm font-semibold text-warmstone-800">
          <span className="flex-1 text-left truncate">{currentName}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-3 pb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md bg-warmstone-50 border border-warmstone-200 text-sm font-semibold text-warmstone-800 hover:bg-warmstone-100 transition-colors min-h-[44px]"
      >
        <span className="flex-1 text-left truncate">{currentName}</span>
        <ChevronDown size={14} className={`shrink-0 text-warmstone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-warmstone-white border border-warmstone-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {households.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setOpen(false);
                router.push(`/household/${h.id}`);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-warmstone-800 hover:bg-warmstone-50 transition-colors text-left"
            >
              <span className="flex-1 truncate">{h.name}</span>
              {h.is_locked && (
                <Lock size={12} className="shrink-0 text-amber-500" />
              )}
              {h.id === currentHouseholdId && (
                <Check size={14} className="shrink-0 text-sage-500" />
              )}
            </button>
          ))}
          {labels.showNewCareRecordButton && (
            <div className="border-t border-warmstone-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setOpen(false);
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
  );
}

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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [dailyCareEnabled, setDailyCareEnabled] = useState<boolean | null>(null);
  const [trialWidget, setTrialWidget] = useState<TrialWidgetState>(null);
  const { labels, isSelfCare } = useUserType();

  const householdMatch = pathname.match(/^\/household\/([^/]+)/);
  const currentHouseholdId = householdMatch ? householdMatch[1] : null;

  const personMatch = pathname.match(/^\/household\/[^/]+\/people\/([^/]+)/);
  const currentPersonId = personMatch ? personMatch[1] : null;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, plan")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) return;
      if (profile.account_type === "admin") setIsAdmin(true);

      // Trial widget: only show for non-admin/tester standard accounts
      if (profile.account_type !== "admin" && profile.account_type !== "tester") {
        const plan = (profile as { plan?: string | null }).plan ?? null;
        if (plan === "free") {
          setTrialWidget({ kind: "ended" });
        } else {
          // Fetch the owned household's trial status
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
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentPersonId) { setDailyCareEnabled(null); return; }
    supabase
      .from("people")
      .select("daily_care_enabled")
      .eq("id", currentPersonId)
      .maybeSingle()
      .then(({ data }) => {
        setDailyCareEnabled(data?.daily_care_enabled ?? false);
      });
  }, [currentPersonId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems = [
    { href: "/dashboard", label: labels.dashboardNavLabel, icon: Home },
    { href: "/letters-vault", label: "Letters vault", icon: BookOpen },
    { href: "/updates", label: "Weekly updates", icon: Mail },
  ];

  const settingsItem = { href: "/settings", label: "Settings", icon: Settings };

  return (
    <aside className="hidden md:flex flex-col w-60 bg-warmstone-white border-r border-warmstone-100 min-h-screen shrink-0">
      <div className="px-5 py-5 border-b border-warmstone-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="md" />
        </Link>
      </div>

      {currentHouseholdId && (
        <div className="pt-3">
          <CareRecordSwitcher currentHouseholdId={currentHouseholdId} />
        </div>
      )}

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href) ||
            (href === "/dashboard" && isSelfCare && pathname.startsWith("/household/"));
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors min-h-[44px]",
                active
                  ? "bg-honey-50 text-honey-800"
                  : "text-warmstone-600 hover:bg-warmstone-50 hover:text-warmstone-900",
              ].join(" ")}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}

        {currentPersonId && currentHouseholdId && (
          <Link
            href={`/household/${currentHouseholdId}/people/${currentPersonId}/daily-care`}
            className={[
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors min-h-[44px]",
              pathname.includes("/daily-care")
                ? "bg-honey-50 text-honey-800"
                : "text-warmstone-600 hover:bg-warmstone-50 hover:text-warmstone-900",
            ].join(" ")}
          >
            <ClipboardList size={18} />
            <span className="flex-1">Daily care</span>
            {dailyCareEnabled !== null && (
              <span className={`w-2 h-2 rounded-full shrink-0 ${dailyCareEnabled ? "bg-sage-400" : "bg-warmstone-300"}`} />
            )}
          </Link>
        )}

        {(() => {
          const active = pathname.startsWith(settingsItem.href);
          return (
            <Link
              href={settingsItem.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors min-h-[44px]",
                active ? "bg-honey-50 text-honey-800" : "text-warmstone-600 hover:bg-warmstone-50 hover:text-warmstone-900",
              ].join(" ")}
            >
              <settingsItem.icon size={18} />
              {settingsItem.label}
            </Link>
          );
        })()}

        {trialWidget && (
          <Link
            href="/settings"
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs transition-colors ${
              trialWidget.kind === "ended"
                ? "bg-red-50 border-red-200 hover:bg-red-100 text-red-800"
                : "bg-honey-50 border-honey-200 hover:bg-honey-100 text-honey-800"
            }`}
          >
            {trialWidget.kind === "ended" ? (
              <Sparkles size={14} className="shrink-0 mt-0.5" />
            ) : (
              <Clock size={14} className="shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold leading-tight">
                {trialWidget.kind === "ended"
                  ? "Trial ended"
                  : trialWidget.daysLeft === 1
                  ? "Trial ends tomorrow"
                  : `${trialWidget.daysLeft} days left`}
              </p>
              <p className="text-xs opacity-75 mt-0.5 leading-tight">
                {trialWidget.kind === "ended" ? "Subscribe to restore AI access" : "Subscribe to keep AI access"}
              </p>
            </div>
          </Link>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-warmstone-100 flex flex-col gap-1">
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-warmstone-500 hover:bg-warmstone-50 hover:text-warmstone-900 transition-colors min-h-[44px]"
          >
            <Shield size={18} />
            Admin
          </Link>
        )}
        <Link
          href="/contact"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-warmstone-500 hover:bg-warmstone-50 hover:text-warmstone-900 transition-colors min-h-[44px]"
        >
          <Mail size={18} />
          Contact us
        </Link>
        <Link
          href="/report-bug"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-warmstone-500 hover:bg-warmstone-50 hover:text-warmstone-900 transition-colors min-h-[44px]"
        >
          <Bug size={18} />
          Report a bug
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-warmstone-600 hover:bg-warmstone-50 hover:text-warmstone-900 transition-colors w-full min-h-[44px]"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
