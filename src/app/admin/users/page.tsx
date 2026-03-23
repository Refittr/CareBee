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

  const withStats = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { count: householdCount } = await svc
        .from("household_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id);
      return {
        ...p,
        account_type: (p.account_type as AccountType) ?? "standard",
        household_count: householdCount ?? 0,
        people_count: 0,
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
