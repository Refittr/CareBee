"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, CalendarDays, Mail, BookOpen, Menu, X,
  Settings, Shield, ChevronDown, Check, Plus, Lock, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useUserType } from "@/lib/context/UserTypeContext";

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

  // Load admin status + household list once
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.account_type === "admin") setIsAdmin(true);
        });
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
            {moreOpen ? <X size={22} /> : <Menu size={22} />}
            <span className="text-xs font-semibold">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
