"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Shield, BookOpen, Settings, Mail, Bug, ChevronDown, Plus, Check } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const navItems = [
  { href: "/dashboard", label: "Care records", icon: Home },
  { href: "/letters-vault", label: "Letters vault", icon: BookOpen },
  { href: "/updates", label: "Weekly updates", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface HouseholdOption {
  id: string;
  name: string;
}

function CareRecordSwitcher({ currentHouseholdId }: { currentHouseholdId: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

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
        .select("id, name")
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
              {h.id === currentHouseholdId && (
                <Check size={14} className="shrink-0 text-sage-500" />
              )}
            </button>
          ))}
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
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);

  const householdMatch = pathname.match(/^\/household\/([^/]+)/);
  const currentHouseholdId = householdMatch ? householdMatch[1] : null;

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
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
          const active = pathname.startsWith(href);
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
