import { createServiceClient } from "@/lib/supabase/server";
import { Users, Home, FileText, UserCheck, UserPlus, TrendingUp, Calendar, CreditCard, Clock, AlertCircle, UserMinus, PoundSterling, Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard | CareBee" };
export const dynamic = "force-dynamic";

// ---- helpers ----

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  highlight?: boolean;
  iconColor?: string;
}) {
  return (
    <div
      className={`bg-warmstone-white border rounded-lg p-4 flex flex-col gap-2 ${
        highlight ? "border-honey-300 bg-honey-50" : "border-warmstone-200"
      }`}
    >
      <div className={`flex items-center gap-2 ${iconColor ?? "text-warmstone-500"}`}>
        <Icon size={15} />
        <span className="text-xs font-medium uppercase tracking-wide text-warmstone-500">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${highlight ? "text-honey-600" : "text-warmstone-900"}`}>
        {value}
      </p>
    </div>
  );
}

const accountTypeBadge: Record<string, string> = {
  admin: "bg-honey-100 text-honey-700 border border-honey-300",
  tester: "bg-sage-100 text-sage-700 border border-sage-300",
  standard: "bg-warmstone-100 text-warmstone-600 border border-warmstone-200",
};

export default async function AdminDashboardPage() {
  const svc = await createServiceClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();

  // Fetch everything in parallel
  const [
    { data: allProfiles },
    { data: allMemberships },
    { data: allPeople },
    { data: allApiUsage },
    { count: totalDocuments },
    { count: activeSubscribers },
    { count: inTrial },
    { count: trialExpired },
    { count: freePlan },
    { count: cancelled },
  ] = await Promise.all([
    svc.from("profiles")
      .select("id, full_name, email, account_type, created_at")
      .order("created_at", { ascending: false }),
    svc.from("household_members").select("user_id, household_id, role"),
    svc.from("people").select("id, household_id"),
    svc.from("api_usage_log")
      .select("user_id, feature, status, created_at")
      .eq("status", "success"),
    svc.from("documents").select("*", { count: "exact", head: true }),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "trial").gt("trial_ends_at", nowIso),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "trial").lte("trial_ends_at", nowIso),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "free"),
    svc.from("households").select("*", { count: "exact", head: true }).eq("subscription_status", "cancelled"),
  ]);

  const profiles = allProfiles ?? [];
  const memberships = allMemberships ?? [];
  const people = allPeople ?? [];
  const apiUsage = allApiUsage ?? [];

  // ---- Growth stats ----
  const todayIso = todayStart.toISOString();
  const weekIso = weekStart.toISOString();
  const monthIso = monthStart.toISOString();
  const totalUsers = profiles.length;
  const todayUsers = profiles.filter((p) => p.created_at >= todayIso).length;
  const weekUsers = profiles.filter((p) => p.created_at >= weekIso).length;
  const monthUsers = profiles.filter((p) => p.created_at >= monthIso).length;

  // ---- Subscription metrics ----
  const activeCount = activeSubscribers ?? 0;
  const expiredCount = (trialExpired ?? 0) + (freePlan ?? 0);
  const cancelledCount = cancelled ?? 0;
  const denominator = activeCount + expiredCount + cancelledCount;
  const conversionRate = denominator > 0 ? `${((activeCount / denominator) * 100).toFixed(1)}%` : "0%";
  const estimatedMrr = `£${(activeCount * 4.99).toFixed(2)}`;

  // ---- Per-user engagement ----
  // Map: userId -> owned household ids
  const ownerHouseholds = new Map<string, Set<string>>();
  const memberHouseholds = new Map<string, Set<string>>();
  for (const m of memberships) {
    if (!memberHouseholds.has(m.user_id)) memberHouseholds.set(m.user_id, new Set());
    memberHouseholds.get(m.user_id)!.add(m.household_id);
    if (m.role === "owner") {
      if (!ownerHouseholds.has(m.user_id)) ownerHouseholds.set(m.user_id, new Set());
      ownerHouseholds.get(m.user_id)!.add(m.household_id);
    }
  }

  // Map: householdId -> people count
  const householdPeopleCount = new Map<string, number>();
  for (const p of people) {
    householdPeopleCount.set(p.household_id, (householdPeopleCount.get(p.household_id) ?? 0) + 1);
  }

  // Map: userId -> { totalCalls, lastUsed, features: Set<string> }
  const userAiMap = new Map<string, { total: number; lastUsed: string; features: Set<string> }>();
  for (const row of apiUsage) {
    if (!row.user_id) continue;
    if (!userAiMap.has(row.user_id)) userAiMap.set(row.user_id, { total: 0, lastUsed: row.created_at, features: new Set() });
    const entry = userAiMap.get(row.user_id)!;
    entry.total++;
    entry.features.add(row.feature);
    if (row.created_at > entry.lastUsed) entry.lastUsed = row.created_at;
  }

  // ---- Engagement funnel ----
  const hasHousehold = new Set(memberships.filter((m) => m.role === "owner").map((m) => m.user_id));
  const hasPerson = new Set(
    Array.from(ownerHouseholds.entries())
      .filter(([, hids]) => Array.from(hids).some((hid) => (householdPeopleCount.get(hid) ?? 0) > 0))
      .map(([uid]) => uid)
  );
  const hasUsedAi = new Set(userAiMap.keys());

  // ---- Per-user rows ----
  const userRows = profiles.map((p) => {
    const ownedHids = ownerHouseholds.get(p.id) ?? new Set<string>();
    const allHids = memberHouseholds.get(p.id) ?? new Set<string>();
    const peopleCount = Array.from(ownedHids).reduce((sum, hid) => sum + (householdPeopleCount.get(hid) ?? 0), 0);
    const ai = userAiMap.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      account_type: p.account_type as string,
      created_at: p.created_at,
      households_owned: ownedHids.size,
      households_member: allHids.size,
      people_count: peopleCount,
      ai_calls: ai?.total ?? 0,
      ai_features: ai ? Array.from(ai.features) : [],
      ai_last_used: ai?.lastUsed ?? null,
    };
  });

  const FEATURE_SHORT: Record<string, string> = {
    document_scan: "scan",
    drug_interaction: "interactions",
    entitlements_check: "entitlements",
    appointment_prep: "appt prep",
    appointment_debrief: "appt debrief",
    waiting_list_estimate: "waitlist",
    document_generation: "doc gen",
    health_insights: "insights",
  };

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-warmstone-900 mb-6">Dashboard</h1>

      {/* Growth stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard icon={Users} label="Total users" value={totalUsers} />
        <StatCard icon={UserPlus} label="Joined today" value={todayUsers} highlight />
        <StatCard icon={TrendingUp} label="This week" value={weekUsers} />
        <StatCard icon={Calendar} label="This month" value={monthUsers} />
      </div>

      {/* Content + tester stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard icon={Home} label="Households" value={hasHousehold.size} />
        <StatCard icon={Users} label="People in care" value={people.length} />
        <StatCard icon={FileText} label="Documents" value={totalDocuments ?? 0} />
        <StatCard icon={UserCheck} label="Testers" value={profiles.filter((p) => p.account_type === "tester").length} />
      </div>

      {/* Subscription stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard icon={CreditCard} label="Subscribers" value={activeCount} iconColor="text-sage-500" />
        <StatCard icon={Clock} label="In trial" value={inTrial ?? 0} iconColor="text-honey-500" />
        <StatCard icon={AlertCircle} label="Trial expired" value={expiredCount} iconColor="text-warmstone-400" />
        <StatCard icon={UserMinus} label="Churned" value={cancelledCount} iconColor="text-error" />
        <StatCard icon={TrendingUp} label="Conversion" value={conversionRate} iconColor="text-sage-500" />
        <StatCard icon={PoundSterling} label="Est. MRR" value={estimatedMrr} iconColor="text-honey-500" />
      </div>

      {/* Engagement funnel */}
      <div className="bg-warmstone-white border border-warmstone-200 rounded-lg p-5 mb-8">
        <h2 className="text-sm font-bold text-warmstone-700 uppercase tracking-wide mb-4">Engagement funnel</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Signed up", count: totalUsers, pct: 100 },
            { label: "Created household", count: hasHousehold.size, pct: totalUsers > 0 ? Math.round((hasHousehold.size / totalUsers) * 100) : 0 },
            { label: "Added person to care", count: hasPerson.size, pct: totalUsers > 0 ? Math.round((hasPerson.size / totalUsers) * 100) : 0 },
            { label: "Used AI feature", count: hasUsedAi.size, pct: totalUsers > 0 ? Math.round((hasUsedAi.size / totalUsers) * 100) : 0 },
          ].map((step) => (
            <div key={step.label} className="flex flex-col gap-1">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-warmstone-900">{step.count}</span>
                <span className="text-sm text-warmstone-400 font-medium mb-0.5">{step.pct}%</span>
              </div>
              <div className="h-1.5 bg-warmstone-100 rounded-full overflow-hidden">
                <div className="h-full bg-honey-400 rounded-full" style={{ width: `${step.pct}%` }} />
              </div>
              <p className="text-xs text-warmstone-500 mt-0.5">{step.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* All users table */}
      <div>
        <h2 className="text-sm font-bold text-warmstone-700 uppercase tracking-wide mb-3">
          All users ({totalUsers})
        </h2>
        <div className="bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warmstone-100 bg-warmstone-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-warmstone-500">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-warmstone-500 hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-warmstone-500">Joined</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-warmstone-500">HH</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-warmstone-500 hidden md:table-cell">People</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-warmstone-500 hidden lg:table-cell">AI used</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-warmstone-500 hidden lg:table-cell">Last AI</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((u) => (
                  <tr key={u.id} className="border-b border-warmstone-50 hover:bg-warmstone-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-warmstone-900 truncate max-w-[140px]">{u.full_name}</p>
                      <p className="text-xs text-warmstone-400 truncate max-w-[160px]">{u.email}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accountTypeBadge[u.account_type] ?? accountTypeBadge.standard}`}>
                        {u.account_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-warmstone-500 whitespace-nowrap">{formatRelative(u.created_at)}</td>
                    <td className="px-4 py-2.5 text-right text-warmstone-600 font-medium text-xs">{u.households_owned}</td>
                    <td className="px-4 py-2.5 text-right text-warmstone-600 text-xs hidden md:table-cell">{u.people_count}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {u.ai_calls === 0 ? (
                        <span className="text-xs text-warmstone-300">None</span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs font-semibold text-sage-700">
                            <Zap size={11} />
                            {u.ai_calls}
                          </span>
                          {u.ai_features.map((f) => (
                            <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-sage-50 text-sage-600 border border-sage-100 font-medium">
                              {FEATURE_SHORT[f] ?? f}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-warmstone-400 text-xs hidden lg:table-cell">
                      {u.ai_last_used ? formatRelative(u.ai_last_used) : <span className="text-warmstone-200">-</span>}
                    </td>
                  </tr>
                ))}
                {userRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-warmstone-400 text-sm">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
