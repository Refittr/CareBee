import { createServiceClient } from "@/lib/supabase/server";
import { ActivityClient } from "./ActivityClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activity | Admin | CareBee" };

export default async function AdminActivityPage() {
  const svc = await createServiceClient();

  const { data: logs, count } = await svc
    .from("admin_activity_log")
    .select("id, user_id, action, entity_type, entity_id, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(0, 49);

  const enriched = await Promise.all(
    (logs ?? []).map(async (log) => {
      if (!log.user_id) return { ...log, user_name: null, user_email: null };
      const { data: profile } = await svc
        .from("profiles")
        .select("full_name, email")
        .eq("id", log.user_id)
        .maybeSingle();
      return {
        ...log,
        metadata: (log.metadata as Record<string, unknown>) ?? {},
        user_name: profile?.full_name ?? null,
        user_email: profile?.email ?? null,
      };
    })
  );

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-warmstone-900 mb-6">Activity</h1>
      <ActivityClient initialActivity={enriched} initialTotal={count ?? 0} />
    </div>
  );
}
