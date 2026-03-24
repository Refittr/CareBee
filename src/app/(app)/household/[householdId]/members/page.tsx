import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MembersClient } from "./MembersClient";
import type { Metadata } from "next";
import type { MemberRole } from "@/lib/types/database";

type Props = { params: Promise<{ householdId: string }> };

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return { title: "Members | CareBee" };
}

type MemberWithProfile = {
  id: string;
  user_id: string;
  household_id: string;
  role: MemberRole;
  accepted_at: string | null;
  profiles: { full_name: string; email: string; avatar_url: string | null } | null;
};

type PendingInviteRow = {
  id: string;
  household_id: string;
  invited_email: string;
  role: MemberRole;
  invite_token: string;
  expires_at: string;
  created_at: string;
};

export default async function MembersPage({ params }: Props) {
  const { householdId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svcEarly = await createServiceClient();

  const [{ data: household }, { data: rawMembers }, { data: userMembership }] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).single(),
    // Service client bypasses RLS so profiles join returns data for all members
    svcEarly
      .from("household_members")
      .select("*, profiles(full_name, email, avatar_url)")
      .eq("household_id", householdId),
    supabase
      .from("household_members")
      .select("role")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!household) notFound();

  const userRole = (userMembership?.role ?? null) as MemberRole | null;
  const isOwner = userRole === "owner";
  const canEdit = userRole === "owner" || userRole === "editor";

  const members = (rawMembers ?? []) as unknown as MemberWithProfile[];

  let pendingInvites: PendingInviteRow[] = [];
  if (canEdit) {
    const svc = svcEarly;
    const now = new Date().toISOString();
    const { data: rawInvites } = await svc
      .from("invitations")
      .select("id, household_id, invited_email, role, invite_token, expires_at, created_at")
      .eq("household_id", householdId)
      .is("accepted_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false });
    pendingInvites = (rawInvites ?? []) as PendingInviteRow[];
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl">
      <Header title="Members" showBack backHref={`/household/${householdId}`} />
      <Breadcrumbs items={[
        { label: "Your care records", href: "/dashboard" },
        { label: household.name, href: `/household/${householdId}` },
        { label: "Members" },
      ]} />
      <MembersClient
        members={members}
        pendingInvites={pendingInvites}
        currentUserId={user.id}
        householdId={householdId}
        householdName={household.name}
        isOwner={isOwner}
        canEdit={canEdit}
      />
    </div>
  );
}
