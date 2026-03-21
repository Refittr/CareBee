import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Home, Users, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your households | CareBee" };

const roleLabels: Record<string, { label: string; variant: "owner" | "active" | "neutral" | "warning" }> = {
  owner: { label: "Owner", variant: "owner" },
  editor: { label: "Editor", variant: "active" },
  viewer: { label: "Viewer", variant: "neutral" },
  emergency_only: { label: "Emergency only", variant: "warning" },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("household_members")
    .select("*, households(*)")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null);

  const households = memberships ?? [];

  async function getHouseholdStats(householdId: string) {
    const [people, members] = await Promise.all([
      supabase.from("people").select("id", { count: "exact" }).eq("household_id", householdId),
      supabase.from("household_members").select("id", { count: "exact" }).eq("household_id", householdId),
    ]);
    return { peopleCount: people.count ?? 0, memberCount: members.count ?? 0 };
  }

  const householdStats = await Promise.all(
    households.map(async (m) => ({
      membership: m,
      stats: await getHouseholdStats(m.household_id),
    }))
  );

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl">
      <Header title="Your households" />
      <Breadcrumbs items={[{ label: "Your households" }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-warmstone-900 hidden md:block">Your households</h1>
        <Link
          href="/household/new"
          className="bg-honey-400 text-warmstone-white font-bold rounded-md px-4 py-2 text-sm hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] flex items-center gap-2 min-h-[44px]"
        >
          <Plus size={16} />
          New household
        </Link>
      </div>

      {households.length === 0 ? (
        <EmptyState
          icon={Home}
          heading="No households yet"
          description="Create a household to start keeping track of your family's care."
          ctaLabel="Create your first household"
          onCta={() => {}}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {householdStats.map(({ membership, stats }) => {
            const household = membership.households as { id: string; name: string } | null;
            if (!household) return null;
            const roleInfo = roleLabels[membership.role] ?? { label: membership.role, variant: "neutral" as const };
            return (
              <Link
                key={household.id}
                href={`/household/${household.id}`}
                className="bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-warmstone-900 text-lg leading-tight">{household.name}</h2>
                  <Badge variant={roleInfo.variant as "owner" | "active" | "neutral" | "warning"}>
                    {roleInfo.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-warmstone-600">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    {stats.peopleCount} {stats.peopleCount === 1 ? "person" : "people"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Home size={14} />
                    {stats.memberCount} {stats.memberCount === 1 ? "member" : "members"}
                  </span>
                </div>
              </Link>
            );
          })}

          <Link
            href="/household/new"
            className="bg-warmstone-50 border border-dashed border-warmstone-200 rounded-lg p-5 hover:bg-warmstone-100 transition-colors flex flex-col items-center justify-center gap-2 text-center min-h-[120px]"
          >
            <Plus size={24} className="text-warmstone-400" />
            <span className="text-sm font-semibold text-warmstone-600">Start a new care record</span>
          </Link>
        </div>
      )}
    </div>
  );
}
