import { createServiceClient } from "@/lib/supabase/server";
import { Users, Home, FileText, UserCheck, UserPlus, TrendingUp, Calendar } from "lucide-react";
import { DashboardRecentActivity } from "./DashboardRecentActivity";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard | CareBee" };

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-warmstone-white border rounded-lg p-4 flex flex-col gap-2 ${
        highlight
          ? "border-honey-300 bg-honey-50"
          : "border-warmstone-200"
      }`}
    >
      <div className="flex items-center gap-2 text-warmstone-500">
        <Icon size={15} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`text-3xl font-bold ${
          highlight ? "text-honey-600" : "text-warmstone-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const svc = await createServiceClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 30);

  const [
    { count: totalUsers },
    { count: todayUsers },
    { count: weekUsers },
    { count: monthUsers },
    { count: totalHouseholds },
    { count: totalPeople },
    { count: totalDocuments },
    { count: activeTesters },
  ] = await Promise.all([
    svc.from("profiles").select("*", { count: "exact", head: true }),
    svc.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    svc.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
    svc.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    svc.from("households").select("*", { count: "exact", head: true }),
    svc.from("people").select("*", { count: "exact", head: true }),
    svc.from("documents").select("*", { count: "exact", head: true }),
    svc.from("profiles").select("*", { count: "exact", head: true }).eq("account_type", "tester"),
  ]);

  // Recent signups
  const { data: recentSignups } = await svc
    .from("profiles")
    .select("id, full_name, email, account_type, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const signupsWithHouseholds = await Promise.all(
    (recentSignups ?? []).map(async (p) => {
      const { count } = await svc
        .from("household_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id);
      return { ...p, household_count: count ?? 0 };
    })
  );

  // Recent activity — first page (10 items), capped at 30 total
  const { data: recentActivity, count: activityTotal } = await svc
    .from("admin_activity_log")
    .select("id, user_id, action, entity_type, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 9);

  const activityWithUsers = await Promise.all(
    (recentActivity ?? []).map(async (log) => {
      if (!log.user_id) return { ...log, user_name: null, user_email: null };
      const { data: profile } = await svc
        .from("profiles")
        .select("full_name, email")
        .eq("id", log.user_id)
        .maybeSingle();
      return { ...log, user_name: profile?.full_name ?? null, user_email: profile?.email ?? null };
    })
  );

  const accountTypeBadge: Record<string, string> = {
    admin: "bg-honey-100 text-honey-700 border border-honey-300",
    tester: "bg-sage-100 text-sage-700 border border-sage-300",
    standard: "bg-warmstone-100 text-warmstone-600 border border-warmstone-200",
  };

  function formatRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-warmstone-900 mb-6">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Users} label="Total users" value={totalUsers ?? 0} />
        <StatCard icon={UserPlus} label="Today" value={todayUsers ?? 0} highlight />
        <StatCard icon={TrendingUp} label="This week" value={weekUsers ?? 0} />
        <StatCard icon={Calendar} label="This month" value={monthUsers ?? 0} />
        <StatCard icon={Home} label="Households" value={totalHouseholds ?? 0} />
        <StatCard icon={Users} label="People in care" value={totalPeople ?? 0} />
        <StatCard icon={FileText} label="Documents" value={totalDocuments ?? 0} />
        <StatCard icon={UserCheck} label="Active testers" value={activeTesters ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <div>
          <h2 className="text-sm font-bold text-warmstone-700 uppercase tracking-wide mb-3">
            Recent signups
          </h2>
          <div className="bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warmstone-100 bg-warmstone-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-warmstone-500">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-warmstone-500 hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-warmstone-500">Joined</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-warmstone-500">HH</th>
                </tr>
              </thead>
              <tbody>
                {signupsWithHouseholds.map((p) => (
                  <tr key={p.id} className="border-b border-warmstone-50 hover:bg-warmstone-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-warmstone-900 truncate max-w-[140px]">{p.full_name}</p>
                      <p className="text-xs text-warmstone-400 truncate max-w-[140px]">{p.email}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accountTypeBadge[p.account_type as string] ?? accountTypeBadge.standard}`}>
                        {p.account_type as string}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-warmstone-500">
                      {formatRelative(p.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-warmstone-600 font-medium text-xs">
                      {p.household_count}
                    </td>
                  </tr>
                ))}
                {signupsWithHouseholds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-warmstone-400 text-sm">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-sm font-bold text-warmstone-700 uppercase tracking-wide mb-3">
            Recent activity
          </h2>
          <DashboardRecentActivity
            initialActivity={activityWithUsers}
            initialTotal={Math.min(activityTotal ?? 0, 30)}
          />
        </div>
      </div>
    </div>
  );
}
