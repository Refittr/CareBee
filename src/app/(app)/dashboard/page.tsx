import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Home, Users, Heart, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { getLabels } from "@/lib/labels";
import type { Metadata } from "next";
import type { UserType } from "@/lib/types/database";

export const metadata: Metadata = { title: "Dashboard | CareBee" };

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

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from("household_members")
      .select("*, households(*)")
      .eq("user_id", user.id)
      .not("accepted_at", "is", null),
    supabase
      .from("profiles")
      .select("user_type, onboarding_dismissed")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const households = memberships ?? [];
  const userType = (profile?.user_type as UserType | null) ?? null;
  const labels = getLabels(userType);

  // Any user with no households goes to onboarding — covers new users, users
  // who abandoned setup mid-flow, and users who had user_type set from a
  // previous attempt but never created a household.
  if (households.length === 0) {
    redirect("/onboarding");
  }

  // Self-care users go straight to their person record — no need to see the household grid
  if (userType === "self_care" && households.length > 0) {
    const owned = households.find((m) => m.role === "owner");
    if (owned) {
      const { data: people } = await supabase
        .from("people")
        .select("id")
        .eq("household_id", owned.household_id)
        .limit(1);
      if (people?.[0]) {
        redirect(`/household/${owned.household_id}/people/${people[0].id}`);
      }
      // Fallback if no person record exists yet
      redirect(`/household/${owned.household_id}`);
    }
  }

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

  // For the onboarding checklist nav links — use the first owned household + person
  const ownedMembership = households.find((m) => m.role === "owner");
  const checklistHouseholdId = ownedMembership?.household_id ?? null;
  let checklistPersonId: string | null = null;
  if (checklistHouseholdId) {
    const { data: firstPerson } = await supabase
      .from("people")
      .select("id")
      .eq("household_id", checklistHouseholdId)
      .limit(1)
      .maybeSingle();
    checklistPersonId = firstPerson?.id ?? null;
  }

  const showChecklist =
    !profile?.onboarding_dismissed &&
    checklistHouseholdId !== null &&
    checklistPersonId !== null;

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl">

      <Header title={labels.dashboardTitle} actions={<SignOutButton />} />
      <Breadcrumbs items={[{ label: labels.breadcrumbDashboard }]} />

      <div className="flex items-center justify-between mb-6 mt-4 md:mt-0">
        <h1 className="text-2xl font-bold text-warmstone-900 hidden md:block">{labels.dashboardTitle}</h1>
        {labels.dashboardNewButton && (
          <Link
            href="/household/new"
            className="bg-honey-400 text-warmstone-white font-bold rounded-md px-4 py-2 text-sm hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] flex items-center gap-2 min-h-[44px]"
          >
            <Plus size={16} />
            {labels.dashboardNewButton}
          </Link>
        )}
      </div>

      {showChecklist && (
        <OnboardingChecklist
          userType={userType as "carer"}
          householdId={checklistHouseholdId!}
          personId={checklistPersonId!}
        />
      )}

      {households.length === 0 ? (
        <EmptyState
          icon={Heart}
          heading={labels.dashboardEmptyHeading}
          description={labels.dashboardEmptyDescription}
          ctaLabel={labels.dashboardEmptyCta ?? undefined}
          ctaHref={labels.dashboardEmptyCta ? "/household/new" : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {householdStats.map(({ membership, stats }) => {
            const household = (membership as unknown as { households: { id: string; name: string; is_locked: boolean } | null }).households;
            if (!household) return null;
            const roleInfo = roleLabels[membership.role] ?? { label: membership.role, variant: "neutral" as const };
            return (
              <Link
                key={household.id}
                href={`/household/${household.id}`}
                className="bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-bold text-warmstone-900 text-lg leading-tight truncate">{household.name}</h2>
                    {household.is_locked && (
                      <Lock size={14} className="shrink-0 text-amber-500" />
                    )}
                  </div>
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

          {labels.dashboardNewRecordTile && (
            <Link
              href="/household/new"
              className="bg-warmstone-50 border border-dashed border-warmstone-200 rounded-lg p-5 hover:bg-warmstone-100 transition-colors flex flex-col items-center justify-center gap-2 text-center min-h-[120px]"
            >
              <Plus size={24} className="text-warmstone-400" />
              <span className="text-sm font-semibold text-warmstone-600">{labels.dashboardNewRecordTile}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
