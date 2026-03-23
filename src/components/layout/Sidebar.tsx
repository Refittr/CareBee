"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Shield, BookOpen, Settings } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Care records", icon: Home },
  { href: "/letters-vault", label: "Letters vault", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);

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
