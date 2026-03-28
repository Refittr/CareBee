import { createServiceClient } from "@/lib/supabase/server";
import { UsersClient } from "./UsersClient";
import type { Metadata } from "next";
import type { AccountType } from "@/lib/types/database";

export const metadata: Metadata = { title: "Users | Admin | CareBee" };

export default async function AdminUsersPage() {
  const svc = await createServiceClient();

  const { data: profiles, count } = await svc
    .from("profiles")
    .select("id, full_name, email, account_type, created_at, trial_ends_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(0, 49);

  // Fetch last_sign_in_at for all users in one call
  const { data: authData } = await svc.auth.admin.listUsers({ perPage: 200 });
  const authMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null])
  );

  const now = new Date();

  const withStats = await Promise.all(
    (profiles ?? []).map(async (p) => {
      // Fix: query households directly by created_by, not via household_members
      const { data: ownedHouseholds } = await svc
        .from("households")
        .select("id, subscription_status, trial_ends_at")
        .eq("created_by", p.id);

      const households = ownedHouseholds ?? [];
      const householdIds = households.map((h) => h.id as string);
      const profileTrialEndsAt = p.trial_ends_at ?? null;

      let subscription_status: import("@/app/api/admin/users/route").UserSubStatus = "none";
      let subscription_days_left: number | null = null;

      if (households.some((h) => h.subscription_status === "active")) {
        subscription_status = "active";
      } else if (households.some((h) => h.subscription_status === "past_due")) {
        subscription_status = "past_due";
      } else if (households.some((h) => h.subscription_status === "cancelled")) {
        subscription_status = "cancelled";
      } else {
        const trialDates = [...households.map((h) => h.trial_ends_at), profileTrialEndsAt];
        const activeTrialDate = trialDates.find((t) => t && new Date(t) > now);
        if (activeTrialDate) {
          subscription_status = "trial_active";
          subscription_days_left = Math.max(
            0,
            Math.ceil((new Date(activeTrialDate).getTime() - now.getTime()) / 86400000)
          );
        } else if (trialDates.some(Boolean)) {
          subscription_status = "trial_expired";
        } else if (householdIds.length > 0) {
          subscription_status = "free";
        }
        // else stays "none"
      }

      const { count: peopleCount } =
        householdIds.length > 0
          ? await svc
              .from("people")
              .select("*", { count: "exact", head: true })
              .in("household_id", householdIds)
          : { count: 0 };

      // AI usage — logged calls
      const { count: aiCount } = await svc
        .from("api_usage_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id);

      const { data: lastAiRow } = await svc
        .from("api_usage_log")
        .select("created_at")
        .eq("user_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Documents scanned via AI (proxy for pre-logging scans)
      const { count: docsScanned } = await svc
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("uploaded_by", p.id)
        .not("description", "is", null);

      return {
        ...p,
        account_type: (p.account_type as AccountType) ?? "standard",
        household_count: householdIds.length,
        people_count: peopleCount ?? 0,
        subscription_status,
        subscription_days_left,
        last_sign_in_at: authMap.get(p.id) ?? null,
        ai_count: aiCount ?? 0,
        docs_scanned: docsScanned ?? 0,
        last_ai_at: lastAiRow?.created_at ?? null,
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
