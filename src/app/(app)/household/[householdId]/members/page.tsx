import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { MembersClient } from "./MembersClient";
import { getInitials } from "@/lib/utils/formatting";
import { formatDateUK } from "@/lib/utils/dates";
import type { Metadata } from "next";

type Props = { params: Promise<{ householdId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: "Members | CareBee" };
}

export default async function MembersPage({ params }: Props) {
  const { householdId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: household }, { data: members }] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).single(),
    supabase
      .from("household_members")
      .select("*, profiles(full_name, email, avatar_url)")
      .eq("household_id", householdId),
  ]);

  if (!household) notFound();

  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl">
      <Header title="Members" showBack backHref={`/household/${householdId}`} />
      <Breadcrumbs items={[
        { label: "Your households", href: "/dashboard" },
        { label: household.name, href: `/household/${householdId}` },
        { label: "Members" },
      ]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-warmstone-900 hidden md:block">Members</h1>
      </div>
      <MembersClient members={(members ?? []) as unknown as Parameters<typeof MembersClient>[0]["members"]} currentUserId={user.id} householdId={householdId} householdName={household.name} />
    </div>
  );
}
