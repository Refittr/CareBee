import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const actionFilter = searchParams.get("action") ?? "";
  const perPage = Math.min(parseInt(searchParams.get("perPage") ?? "50", 10), 50);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = svc
    .from("admin_activity_log")
    .select("id, user_id, action, entity_type, entity_id, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (actionFilter) {
    query = query.eq("action", actionFilter);
  }

  const { data: logs, count } = await query;

  if (!logs) return NextResponse.json({ activity: [], total: 0 });

  // Enrich with user profile
  const enriched = await Promise.all(
    logs.map(async (log) => {
      if (!log.user_id) return { ...log, user_name: null, user_email: null };
      const { data: profile } = await svc
        .from("profiles")
        .select("full_name, email")
        .eq("id", log.user_id)
        .maybeSingle();
      return {
        ...log,
        user_name: profile?.full_name ?? null,
        user_email: profile?.email ?? null,
      };
    })
  );

  return NextResponse.json({ activity: enriched, total: count ?? 0 });
}
