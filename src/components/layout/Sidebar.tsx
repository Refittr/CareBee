"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Households", icon: Home },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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
      <div className="px-3 py-4 border-t border-warmstone-100">
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
