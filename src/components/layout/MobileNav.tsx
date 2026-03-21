"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Households", icon: Home },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-warmstone-white border-t border-warmstone-100 z-40 safe-area-pb">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors",
                active ? "text-honey-600" : "text-warmstone-400",
              ].join(" ")}
            >
              <Icon size={22} />
              <span className="text-xs font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
