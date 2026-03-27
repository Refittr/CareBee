import { createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics | CareBee Admin" };
export const dynamic = "force-dynamic";

// ---- helpers ----

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatPct(n: number, d: number): string {
  if (d === 0) return "0%";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const FEATURE_LABELS: Record<string, string> = {
  document_scan: "Document scan",
  entitlements_check: "Entitlements check",
  drug_interaction: "Drug interactions",
  appointment_prep: "Appointment prep",
  appointment_debrief: "Appointment debrief",
  waiting_list_estimate: "Waiting list estimate",
  document_generation: "Document generation",
  health_insights: "Health insights",
};

// ---- stat card ----

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-warmstone-100 rounded-xl p-5">
      <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-warmstone-900">{value}</p>
      {sub && <p className="text-xs text-warmstone-400 mt-1">{sub}</p>}
    </div>
  );
}

// ---- horizontal bar chart ----

function BarChart({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-warmstone-700 font-medium truncate max-w-[180px]">{row.label}</span>
            <span className="text-xs text-warmstone-500 ml-2 shrink-0">{row.value}{row.sub ? ` ${row.sub}` : ""}</span>
          </div>
          <div className="h-2 bg-warmstone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-honey-400 rounded-full transition-all"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- daily sparkline ----

function DailyChart({ days }: { days: { date: string; total: number; errors: number }[] }) {
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-0.5 h-20 w-full">
      {days.map((day) => {
        const heightPct = (day.total / max) * 100;
        const errPct = day.total > 0 ? (day.errors / day.total) * 100 : 0;
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col justify-end rounded-sm overflow-hidden group relative"
            title={`${day.date}: ${day.total} calls, ${day.errors} errors`}
            style={{ height: `${Math.max(heightPct, 4)}%` }}
          >
            <div className="w-full bg-honey-400 flex-1 relative">
              {errPct > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-red-400"
                  style={{ height: `${errPct}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- section heading ----

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-bold text-warmstone-500 uppercase tracking-wide mb-4">{title}</h2>
  );
}

// ---- main page ----

export default async function AnalyticsPage() {
  const svc = await createServiceClient();
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all needed data in parallel
  const [
    { data: apiLogs },
    { data: pageLogs },
    { data: errorLogs },
    { count: medCount },
    { count: apptCount },
    { count: docCount },
    { count: peopleCount },
    { count: householdCount },
    { data: profileRows },
  ] = await Promise.all([
    svc.from("api_usage_log").select("user_id, feature, status, tokens_used, duration_ms, created_at").gte("created_at", monthAgo.toISOString()),
    svc.from("page_view_log").select("path, created_at").gte("created_at", monthAgo.toISOString()),
    svc.from("error_log").select("error_type, error_message, path, user_id, created_at").order("created_at", { ascending: false }).limit(30),
    svc.from("medications").select("id", { count: "exact", head: true }),
    svc.from("appointments").select("id", { count: "exact", head: true }),
    svc.from("documents").select("id", { count: "exact", head: true }),
    svc.from("people").select("id", { count: "exact", head: true }),
    svc.from("households").select("id", { count: "exact", head: true }),
    svc.from("profiles").select("id, full_name, email, account_type, created_at").order("created_at", { ascending: false }),
  ]);

  const api = apiLogs ?? [];
  const pages = pageLogs ?? [];
  const errors = errorLogs ?? [];
  const profiles = profileRows ?? [];

  // ---- Overview stats ----
  const apiToday = api.filter((r) => r.created_at >= todayStart.toISOString());
  const apiWeek = api.filter((r) => r.created_at >= weekAgo.toISOString());
  const apiErrors = api.filter((r) => r.status === "error");
  const totalTokens = api.reduce((sum, r) => sum + (r.tokens_used ?? 0), 0);
  const avgDuration = api.length > 0
    ? Math.round(api.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / api.length)
    : 0;

  // ---- Daily API calls (last 30 days) ----
  const dayBuckets: Record<string, { total: number; errors: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayBuckets[d.toISOString().slice(0, 10)] = { total: 0, errors: 0 };
  }
  for (const r of api) {
    const day = r.created_at.slice(0, 10);
    if (dayBuckets[day]) {
      dayBuckets[day].total++;
      if (r.status === "error") dayBuckets[day].errors++;
    }
  }
  const dailyChartData = Object.entries(dayBuckets).map(([date, v]) => ({ date, ...v }));

  // ---- Feature breakdown (API) ----
  const featureTotals: Record<string, { total: number; errors: number }> = {};
  for (const r of api) {
    if (!featureTotals[r.feature]) featureTotals[r.feature] = { total: 0, errors: 0 };
    featureTotals[r.feature].total++;
    if (r.status === "error") featureTotals[r.feature].errors++;
  }
  const featureRows = Object.entries(featureTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([feature, v]) => ({
      label: FEATURE_LABELS[feature] ?? feature,
      value: v.total,
      sub: v.errors > 0 ? `(${v.errors} err)` : undefined,
    }));

  // ---- Recent signups ----
  const recentSignups = profiles.slice(0, 15).map((p) => ({
    name: p.full_name ?? "",
    email: p.email ?? "",
    accountType: (p.account_type ?? "standard") as string,
    created_at: (p as { created_at: string }).created_at,
  }));

  // ---- Most active users (from api_usage_log — all AI calls) ----
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const userAiActivity: Record<string, { count: number; last: string; features: Set<string> }> = {};
  for (const r of api) {
    if (!r.user_id) continue;
    if (!userAiActivity[r.user_id]) userAiActivity[r.user_id] = { count: 0, last: r.created_at, features: new Set() };
    userAiActivity[r.user_id].count++;
    userAiActivity[r.user_id].features.add(r.feature);
    if (r.created_at > userAiActivity[r.user_id].last) userAiActivity[r.user_id].last = r.created_at;
  }
  const topUsers = Object.entries(userAiActivity)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([userId, v]) => {
      const profile = profileMap.get(userId);
      return {
        userId,
        name: profile?.full_name ?? "Unknown",
        email: profile?.email ?? "",
        accountType: (profile?.account_type ?? "standard") as string,
        count: v.count,
        features: Array.from(v.features),
        last: v.last,
      };
    });

  // ---- AI scan history ----
  const scanLogs = api
    .filter((r) => r.feature === "document_scan" && r.status === "success")
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
    .slice(0, 20)
    .map((r) => {
      const profile = r.user_id ? profileMap.get(r.user_id) : null;
      return { name: profile?.full_name ?? "Unknown", email: profile?.email ?? "", created_at: r.created_at };
    });

  // ---- Top pages ----
  const pageCounts: Record<string, number> = {};
  for (const r of pages) {
    pageCounts[r.path] = (pageCounts[r.path] ?? 0) + 1;
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warmstone-900">Analytics</h1>
        <p className="text-sm text-warmstone-500 mt-1">Last 30 days unless noted. Data updates in real time.</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="AI calls today" value={formatNumber(apiToday.length)} />
        <StatCard label="AI calls this week" value={formatNumber(apiWeek.length)} />
        <StatCard label="AI calls this month" value={formatNumber(api.length)} sub={`${formatNumber(totalTokens)} tokens total`} />
        <StatCard label="API error rate" value={formatPct(apiErrors.length, api.length)} sub={`${apiErrors.length} errors, avg ${avgDuration}ms`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Users with AI calls (30d)" value={new Set(api.map((r) => r.user_id).filter(Boolean)).size} />
        <StatCard label="Page views (30 days)" value={formatNumber(pages.length)} />
        <StatCard label="Errors logged (30 days)" value={errors.length} />
        <StatCard label="Total signups" value={profiles.length} />
      </div>

      {/* Daily API chart + Feature breakdown side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-warmstone-100 rounded-xl p-6">
          <SectionHeading title="AI API calls per day" />
          <DailyChart days={dailyChartData} />
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-warmstone-500"><span className="w-2.5 h-2.5 rounded-sm bg-honey-400 inline-block" /> Successful</span>
            <span className="flex items-center gap-1.5 text-xs text-warmstone-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Errors</span>
          </div>
        </div>

        <div className="bg-white border border-warmstone-100 rounded-xl p-6">
          <SectionHeading title="AI calls by feature" />
          {featureRows.length === 0
            ? <p className="text-sm text-warmstone-400">No data yet.</p>
            : <BarChart rows={featureRows} />}
        </div>
      </div>

      {/* Recent signups */}
      <div className="bg-white border border-warmstone-100 rounded-xl p-6 mb-6">
        <SectionHeading title="Recent signups" />
        {recentSignups.length === 0 ? (
          <p className="text-sm text-warmstone-400">No signups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warmstone-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Name</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Email</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Type</th>
                  <th className="text-right py-2 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmstone-50">
                {recentSignups.map((u, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4 font-medium text-warmstone-800">{u.name || "-"}</td>
                    <td className="py-2.5 pr-4 text-warmstone-500 text-xs">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${u.accountType === "admin" ? "bg-honey-100 text-honey-700" : u.accountType === "tester" ? "bg-sage-100 text-sage-700" : "bg-warmstone-100 text-warmstone-600"}`}>
                        {u.accountType}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-warmstone-400 text-xs">{relativeTime(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Most active users (AI calls) */}
      <div className="bg-white border border-warmstone-100 rounded-xl p-6 mb-6">
        <SectionHeading title="Most active users — AI calls (30 days)" />
        {topUsers.length === 0 ? (
          <p className="text-sm text-warmstone-400">No AI calls logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warmstone-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Name</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Email</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Account</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Features used</th>
                  <th className="text-right py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">AI calls</th>
                  <th className="text-right py-2 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Last call</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmstone-50">
                {topUsers.map((u) => (
                  <tr key={u.userId}>
                    <td className="py-2.5 pr-4 font-medium text-warmstone-800">{u.name}</td>
                    <td className="py-2.5 pr-4 text-warmstone-500 text-xs">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${u.accountType === "admin" ? "bg-honey-100 text-honey-700" : u.accountType === "tester" ? "bg-sage-100 text-sage-700" : "bg-warmstone-100 text-warmstone-600"}`}>
                        {u.accountType}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {u.features.map((f) => (
                          <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-sage-50 text-sage-700 border border-sage-100 font-medium">
                            {FEATURE_LABELS[f] ?? f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-warmstone-900">{u.count}</td>
                    <td className="py-2.5 text-right text-warmstone-400 text-xs">{relativeTime(u.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI scan history */}
      <div className="bg-white border border-warmstone-100 rounded-xl p-6 mb-6">
        <SectionHeading title="Document scan history (30 days)" />
        {scanLogs.length === 0 ? (
          <p className="text-sm text-warmstone-400">No document scans in the last 30 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warmstone-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">User</th>
                  <th className="text-left py-2 text-xs font-semibold text-warmstone-500 uppercase tracking-wide">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warmstone-50">
                {scanLogs.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-warmstone-800">{s.name}</p>
                      <p className="text-xs text-warmstone-400">{s.email}</p>
                    </td>
                    <td className="py-2.5 text-warmstone-500 text-xs">{relativeTime(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top pages + error log side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-warmstone-100 rounded-xl p-6">
          <SectionHeading title="Top pages (30 days)" />
          {topPages.length === 0 ? (
            <p className="text-sm text-warmstone-400">No page views logged yet.</p>
          ) : (
            <BarChart rows={topPages.map(([path, count]) => ({ label: path, value: count }))} />
          )}
        </div>

        <div className="bg-white border border-warmstone-100 rounded-xl p-6">
          <SectionHeading title="Recent errors" />
          {errors.length === 0 ? (
            <p className="text-sm text-warmstone-400">No errors logged. Great!</p>
          ) : (
            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
              {errors.slice(0, 15).map((e, i) => (
                <div key={i} className="border border-warmstone-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{e.error_type}</span>
                    <span className="text-xs text-warmstone-400 shrink-0">{relativeTime(e.created_at)}</span>
                  </div>
                  <p className="text-xs text-warmstone-700 line-clamp-2">{e.error_message}</p>
                  {e.path && <p className="text-xs text-warmstone-400 mt-1 font-mono">{e.path}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content stats */}
      <div className="bg-white border border-warmstone-100 rounded-xl p-6">
        <SectionHeading title="Content stats (all time)" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "People in care", value: peopleCount ?? 0 },
            { label: "Households", value: householdCount ?? 0 },
            { label: "Medications", value: medCount ?? 0 },
            { label: "Appointments", value: apptCount ?? 0 },
            { label: "Documents", value: docCount ?? 0 },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-2xl font-bold text-warmstone-900">{formatNumber(item.value)}</p>
              <p className="text-xs text-warmstone-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
