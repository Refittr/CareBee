import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Link2Off, UserPlus } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { MemberRole } from "@/lib/types/database";

type InvitationWithHousehold = {
  id: string;
  household_id: string;
  invited_email: string;
  role: MemberRole;
  accepted_at: string | null;
  expires_at: string;
  invited_by: string;
  invite_token: string;
  households: { id: string; name: string };
};

async function handleAccept(inviteToken: string) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/invite/accept?token=${inviteToken}`);

  const svc = await createServiceClient();
  const { data: invite } = await svc
    .from("invitations")
    .select("*, households(id, name)")
    .eq("invite_token", inviteToken)
    .maybeSingle() as unknown as { data: InvitationWithHousehold | null };

  if (
    !invite ||
    invite.accepted_at ||
    (invite.expires_at && invite.expires_at < new Date().toISOString())
  ) {
    redirect("/dashboard");
  }

  await supabase.from("household_members").insert({
    household_id: invite.household_id,
    user_id: user.id,
    role: invite.role,
    accepted_at: new Date().toISOString(),
  });

  await svc
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  redirect(`/household/${invite.household_id}`);
}

const roleLabels: Record<MemberRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
  emergency_only: "Emergency only",
};

const roleBadgeVariant: Record<MemberRole, "owner" | "active" | "neutral" | "info"> = {
  owner: "owner",
  editor: "active",
  viewer: "neutral",
  emergency_only: "info",
};

const roleActionDescription: Record<MemberRole, string> = {
  owner: "manage",
  editor: "see and edit",
  viewer: "see",
  emergency_only: "view emergency summaries for",
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function InviteAcceptPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidState />;
  }

  const svc = await createServiceClient();
  const { data: invite } = await svc
    .from("invitations")
    .select("*, households(id, name)")
    .eq("invite_token", token)
    .maybeSingle() as unknown as { data: InvitationWithHousehold | null };

  if (!invite) {
    return <InvalidState />;
  }

  if (invite.expires_at < new Date().toISOString()) {
    return <InvalidState />;
  }

  if (invite.accepted_at) {
    return (
      <PageWrapper>
        <AlreadyAcceptedState householdName={invite.households.name} householdId={invite.household_id} />
      </PageWrapper>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PageWrapper>
        <LoginRequiredState
          householdName={invite.households.name}
          role={invite.role}
          token={token}
        />
      </PageWrapper>
    );
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", invite.household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return (
      <PageWrapper>
        <AlreadyMemberState householdName={invite.households.name} householdId={invite.household_id} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <AcceptState
        householdName={invite.households.name}
        role={invite.role}
        token={token}
        handleAccept={handleAccept}
      />
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-6">
        <Logo size="sm" />
      </Link>
      {children}
    </div>
  );
}

function InvalidState() {
  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-6">
        <Logo size="sm" />
      </Link>
      <div className="bg-warmstone-white border border-warmstone-100 rounded-2xl shadow-sm p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
        <Link2Off size={48} className="text-warmstone-400" />
        <h1 className="text-xl font-bold text-warmstone-900">
          This invitation has expired or is no longer valid
        </h1>
        <p className="text-sm text-warmstone-600">
          Ask the person who invited you to send a new link.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer bg-transparent text-warmstone-800 border border-warmstone-200 hover:bg-warmstone-100 px-6 py-3 text-base min-h-[44px]"
        >
          Go to home page
        </Link>
      </div>
    </div>
  );
}

function LoginRequiredState({
  householdName,
  role,
  token,
}: {
  householdName: string;
  role: MemberRole;
  token: string;
}) {
  const redirectPath = `/invite/accept?token=${token}`;
  return (
    <div className="bg-warmstone-white border border-warmstone-100 rounded-2xl shadow-sm p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
      <UserPlus size={48} className="text-honey-400" />
      <span className="bg-honey-50 text-honey-800 rounded-full px-3 py-1 text-sm font-bold">
        {householdName}
      </span>
      <h1 className="text-xl font-bold text-warmstone-900">
        You have been invited to join {householdName}
      </h1>
      <p className="text-sm text-warmstone-600">
        Sign in or create a free account to accept your invitation.
      </p>
      <p className="text-sm text-warmstone-700">
        You will join as:{" "}
        <Badge variant={roleBadgeVariant[role]}>{roleLabels[role]}</Badge>
      </p>
      <div className="flex flex-col gap-3 w-full">
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          className="inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)] px-6 py-3 text-base min-h-[44px] w-full"
        >
          Sign in
        </Link>
        <Link
          href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}
          className="inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer bg-transparent text-warmstone-800 border border-warmstone-200 hover:bg-warmstone-100 px-6 py-3 text-base min-h-[44px] w-full"
        >
          Create a free account
        </Link>
      </div>
    </div>
  );
}

function AcceptState({
  householdName,
  role,
  token,
  handleAccept,
}: {
  householdName: string;
  role: MemberRole;
  token: string;
  handleAccept: (token: string) => Promise<void>;
}) {
  const boundAction = handleAccept.bind(null, token);
  return (
    <div className="bg-warmstone-white border border-warmstone-100 rounded-2xl shadow-sm p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
      <UserPlus size={48} className="text-honey-400" />
      <span className="bg-honey-50 text-honey-800 rounded-full px-3 py-1 text-sm font-bold">
        {householdName}
      </span>
      <h1 className="text-xl font-bold text-warmstone-900">
        Join {householdName}?
      </h1>
      <p className="text-sm text-warmstone-600">
        You have been invited to join as{" "}
        <Badge variant={roleBadgeVariant[role]}>{roleLabels[role]}</Badge>
        . You will be able to {roleActionDescription[role]} the care records in this household.
      </p>
      <form action={boundAction} className="w-full flex flex-col gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)] px-6 py-3 text-base min-h-[44px] w-full"
        >
          Accept invitation
        </button>
      </form>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer bg-transparent text-warmstone-800 border border-warmstone-200 hover:bg-warmstone-100 px-6 py-3 text-base min-h-[44px] w-full"
      >
        No thanks
      </Link>
    </div>
  );
}

function AlreadyAcceptedState({
  householdName,
  householdId,
}: {
  householdName: string;
  householdId: string;
}) {
  return (
    <div className="bg-warmstone-white border border-warmstone-100 rounded-2xl shadow-sm p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
      <CheckCircle size={48} className="text-sage-400" />
      <h1 className="text-xl font-bold text-warmstone-900">
        You have already accepted this invitation
      </h1>
      <Link
        href={`/household/${householdId}`}
        className="inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)] px-6 py-3 text-base min-h-[44px] w-full"
      >
        Go to {householdName}
      </Link>
    </div>
  );
}

function AlreadyMemberState({
  householdName,
  householdId,
}: {
  householdName: string;
  householdId: string;
}) {
  return (
    <div className="bg-warmstone-white border border-warmstone-100 rounded-2xl shadow-sm p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
      <CheckCircle size={48} className="text-sage-400" />
      <h1 className="text-xl font-bold text-warmstone-900">
        You are already a member of this household
      </h1>
      <Link
        href={`/household/${householdId}`}
        className="inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)] px-6 py-3 text-base min-h-[44px] w-full"
      >
        Go to {householdName}
      </Link>
    </div>
  );
}
