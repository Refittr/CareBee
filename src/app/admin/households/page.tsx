import { createServiceClient } from "@/lib/supabase/server";
import { HouseholdsClient } from "./HouseholdsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Households | Admin | CareBee" };

export default async function AdminHouseholdsPage() {
  const svc = await createServiceClient();

  const { data: households, count } = await svc
    .from("households")
    .select("id, name, created_by, created_at, subscription_status, trial_ends_at, subscription_started_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, 49);

  const withStats = await Promise.all(
    (households ?? []).map(async (h) => {
      const [{ count: memberCount }, { count: peopleCount }, { data: owner }] =
        await Promise.all([
          svc
            .from("household_members")
            .select("*", { count: "exact", head: true })
            .eq("household_id", h.id),
          svc
            .from("people")
            .select("*", { count: "exact", head: true })
            .eq("household_id", h.id),
          svc
            .from("profiles")
            .select("full_name, email")
            .eq("id", h.created_by)
            .maybeSingle(),
        ]);

      const daysLeft = h.subscription_status === "trial" && h.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(h.trial_ends_at).getTime() - Date.now()) / 86400000))
        : null;

      return {
        ...h,
        member_count: memberCount ?? 0,
        people_count: peopleCount ?? 0,
        owner_name: owner?.full_name ?? null,
        owner_email: owner?.email ?? null,
        trial_days_left: daysLeft,
      };
    })
  );

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-warmstone-900 mb-6">Households</h1>
      <HouseholdsClient initialHouseholds={withStats} initialTotal={count ?? 0} />
    </div>
  );
}
