import { createServiceClient } from "@/lib/supabase/server";
import { UsersClient } from "./UsersClient";
import type { Metadata } from "next";
import type { AccountType } from "@/lib/types/database";

export const metadata: Metadata = { title: "Users | Admin | CareBee" };

export default async function AdminUsersPage() {
  const svc = await createServiceClient();

  const { data: profiles, count } = await svc
    .from("profiles")
    .select("id, full_name, email, account_type, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(0, 49);

  const now = new Date();

  const withStats = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const [{ count: householdCount }, { data: ownedMemberships }] = await Promise.all([
        svc.from("household_members").select("*", { count: "exact", head: true }).eq("user_id", p.id),
        svc.from("household_members").select("household_id").eq("user_id", p.id).eq("role", "owner"),
      ]);

      let subscription_status: string = "none";
      let subscription_days_left: number | null = null;

      if (ownedMemberships && ownedMemberships.length > 0) {
        const ids = ownedMemberships.map((m) => m.household_id as string);
        const { data: hh } = await svc
          .from("households")
          .select("subscription_status, trial_ends_at")
          .in("id", ids);

        for (const h of hh ?? []) {
          if (h.subscription_status === "active") { subscription_status = "active"; break; }
        }
        if (subscription_status === "none") {
          for (const h of hh ?? []) {
            if (h.subscription_status === "past_due") { subscription_status = "past_due"; break; }
          }
        }
        if (subscription_status === "none") {
          for (const h of hh ?? []) {
            if (h.subscription_status === "trial" && h.trial_ends_at && new Date(h.trial_ends_at) > now) {
              subscription_status = "trial_active";
              subscription_days_left = Math.max(0, Math.ceil((new Date(h.trial_ends_at).getTime() - now.getTime()) / 86400000));
              break;
            }
          }
        }
        if (subscription_status === "none") {
          for (const h of hh ?? []) {
            if (h.subscription_status === "trial") { subscription_status = "trial_expired"; break; }
          }
        }
        if (subscription_status === "none") {
          for (const h of hh ?? []) {
            if (h.subscription_status === "cancelled") { subscription_status = "cancelled"; break; }
          }
        }
        if (subscription_status === "none") {
          if ((hh ?? []).length > 0) subscription_status = "free";
        }
      }

      return {
        ...p,
        account_type: (p.account_type as AccountType) ?? "standard",
        household_count: householdCount ?? 0,
        people_count: 0,
        subscription_status: subscription_status as import("@/app/api/admin/users/route").UserSubStatus,
        subscription_days_left,
      };
    })
  );

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-warmstone-900 mb-6">Users</h1>
      <UsersClient initialUsers={withStats} initialTotal={count ?? 0} />
    </div>
  );
}
