import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

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
    { count: totalActivityLogs },
  ] = await Promise.all([
    svc.from("profiles").select("*", { count: "exact", head: true }),
    svc
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    svc
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString()),
    svc
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    svc.from("households").select("*", { count: "exact", head: true }),
    svc.from("people").select("*", { count: "exact", head: true }),
    svc.from("documents").select("*", { count: "exact", head: true }),
    svc
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("account_type", "tester"),
    svc.from("admin_activity_log").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    totalUsers,
    todayUsers,
    weekUsers,
    monthUsers,
    totalHouseholds,
    totalPeople,
    totalDocuments,
    activeTesters,
    totalActivityLogs,
  });
}
