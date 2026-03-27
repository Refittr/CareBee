import Link from "next/link";
import { LayoutDashboard, Users, Home, Activity, ArrowLeft, Shield, BarChart2, Mail, Send } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin | CareBee" };

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/households", label: "Households", icon: Home, exact: false },
  { href: "/admin/activity", label: "Activity", icon: Activity, exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2, exact: false },
  { href: "/admin/outreach", label: "Outreach", icon: Send, exact: false },
  { href: "/admin/messages", label: "Messages", icon: Mail, exact: false },
];

function AdminSidebar() {
  return (
    <aside className="w-56 shrink-0 bg-warmstone-50 border-r border-warmstone-200 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-warmstone-200">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-honey-500" />
          <span className="font-bold text-warmstone-900 text-sm">CareBee Admin</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-warmstone-700 hover:bg-warmstone-100 hover:text-warmstone-900 transition-colors"
          >
            <item.icon size={16} className="text-warmstone-500" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-warmstone-200">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-warmstone-500 hover:bg-warmstone-100 hover:text-warmstone-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to app
        </Link>
      </div>
    </aside>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-warmstone-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
