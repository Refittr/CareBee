"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, Trash2, Copy, X, Mail, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/Modal";
import { useAppToast } from "@/components/layout/AppShell";
import { getInitials } from "@/lib/utils/formatting";
import { getRelativeTime } from "@/lib/utils/dates";
import type { MemberRole } from "@/lib/types/database";

interface Member {
  id: string;
  user_id: string;
  household_id: string;
  role: MemberRole;
  accepted_at: string | null;
  profiles: { full_name: string; email: string; avatar_url: string | null } | null;
}

interface PendingInvite {
  id: string;
  household_id: string;
  invited_email: string;
  role: MemberRole;
  invite_token: string;
  expires_at: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

interface MembersClientProps {
  members: Member[];
  pendingInvites: PendingInvite[];
  currentUserId: string;
  householdId: string;
  householdName: string;
  isOwner: boolean;
  canEdit: boolean;
}

const roleAvatarClasses: Record<MemberRole, string> = {
  owner: "bg-honey-100 text-honey-800",
  editor: "bg-sage-100 text-sage-800",
  viewer: "bg-warmstone-100 text-warmstone-700",
  emergency_only: "bg-info-light text-info",
};

const roleBadgeVariant: Record<MemberRole, "owner" | "active" | "neutral" | "info"> = {
  owner: "owner",
  editor: "active",
  viewer: "neutral",
  emergency_only: "info",
};

const roleLabels: Record<MemberRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
  emergency_only: "Emergency only",
};

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return "expired";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function MembersClient({
  members: initialMembers,
  pendingInvites: initialPendingInvites,
  currentUserId,
  householdId,
  householdName,
  isOwner,
  canEdit,
}: MembersClientProps) {
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialPendingInvites);

  const [removeMemberTarget, setRemoveMemberTarget] = useState<Member | null>(null);
  const [cancelInviteTarget, setCancelInviteTarget] = useState<PendingInvite | null>(null);
  const [removing, setRemoving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, newRole: MemberRole) {
    setRoleChanging(memberId);
    const { error } = await supabase
      .from("household_members")
      .update({ role: newRole })
      .eq("id", memberId);
    if (error) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      const member = members.find((m) => m.id === memberId);
      const name = member?.profiles?.full_name ?? "Member";
      addToast(`${name} is now ${roleLabels[newRole]}.`, "success");
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    }
    setRoleChanging(null);
  }

  async function handleRemoveMember() {
    if (!removeMemberTarget) return;
    setRemoving(true);
    const { error } = await supabase
      .from("household_members")
      .delete()
      .eq("id", removeMemberTarget.id);
    if (error) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Member removed.", "success");
      setMembers((prev) => prev.filter((m) => m.id !== removeMemberTarget.id));
      setRemoveMemberTarget(null);
    }
    setRemoving(false);
  }

  async function handleCancelInvite() {
    if (!cancelInviteTarget) return;
    setCancelling(true);
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", cancelInviteTarget.id);
    if (error) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Invitation cancelled.", "success");
      setPendingInvites((prev) => prev.filter((i) => i.id !== cancelInviteTarget.id));
      setCancelInviteTarget(null);
    }
    setCancelling(false);
  }

  async function handleCopyInviteLink(invite: PendingInvite) {
    const link = `${window.location.origin}/invite/accept?token=${invite.invite_token}`;
    await navigator.clipboard.writeText(link);
    setCopiedInviteId(invite.id);
    addToast("Link copied.", "success");
    setTimeout(() => setCopiedInviteId(null), 2000);
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-warmstone-900 hidden md:block">Members</h1>
        {canEdit && (
          <Link
            href={`/household/${householdId}/invite`}
            className="inline-flex items-center justify-center gap-2 rounded-md transition-colors cursor-pointer bg-honey-400 text-warmstone-white font-bold hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)] px-4 py-2.5 text-sm min-h-[44px]"
          >
            <UserPlus size={16} />
            Invite someone
          </Link>
        )}
      </div>

      {/* Members section */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-warmstone-900 mb-3">Members</h2>
        <div className="flex flex-col gap-3">
          {members.map((member) => {
            const name = member.profiles?.full_name ?? "Unknown";
            const email = member.profiles?.email ?? "";
            const isCurrentUser = member.user_id === currentUserId;
            const canManage = isOwner && !isCurrentUser && member.role !== "owner";

            return (
              <div
                key={member.id}
                className="bg-warmstone-white border border-warmstone-100 rounded-lg p-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                    roleAvatarClasses[member.role],
                  ].join(" ")}
                >
                  {getInitials(name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-semibold text-warmstone-900 truncate">{name}</p>
                    {isCurrentUser && (
                      <span className="text-warmstone-400 text-sm">(you)</span>
                    )}
                    <Badge variant={roleBadgeVariant[member.role]}>
                      {roleLabels[member.role]}
                    </Badge>
                  </div>
                  <p className="text-sm text-warmstone-400 truncate">{email}</p>
                  {member.accepted_at && (
                    <p className="text-xs text-warmstone-400">
                      Joined {getRelativeTime(member.accepted_at)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value as MemberRole)
                      }
                      disabled={roleChanging === member.id}
                      className="text-sm border border-warmstone-200 rounded-md px-2 py-1.5 bg-warmstone-white text-warmstone-800 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400 cursor-pointer min-h-[44px]"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => setRemoveMemberTarget(member)}
                      className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={`Remove ${name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pending invitations section */}
      {canEdit && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-warmstone-900 mb-3">Pending invitations</h2>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-warmstone-400">No pending invitations.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-warmstone-white border border-warmstone-100 rounded-lg p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail size={16} className="text-warmstone-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-warmstone-800 truncate">
                        {invite.invited_email}
                      </p>
                      <p className="text-xs text-warmstone-400">
                        Invited by {invite.profiles?.full_name ?? "someone"}, expires{" "}
                        {timeUntil(invite.expires_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={roleBadgeVariant[invite.role]}>
                      {roleLabels[invite.role]}
                    </Badge>
                    <button
                      onClick={() => handleCopyInviteLink(invite)}
                      className="p-2 text-warmstone-400 hover:text-warmstone-900 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Copy invite link"
                    >
                      {copiedInviteId === invite.id ? (
                        <Check size={16} className="text-sage-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => setCancelInviteTarget(invite)}
                      className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Cancel invitation"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Remove member confirm modal */}
      <ConfirmModal
        open={!!removeMemberTarget}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={handleRemoveMember}
        title="Remove member"
        description={`Remove ${removeMemberTarget?.profiles?.full_name ?? "this member"} from ${householdName}? They will lose access to all records in this household.`}
        confirmLabel="Remove"
        loading={removing}
      />

      {/* Cancel invite confirm modal */}
      <ConfirmModal
        open={!!cancelInviteTarget}
        onClose={() => setCancelInviteTarget(null)}
        onConfirm={handleCancelInvite}
        title="Cancel invitation"
        description={`Cancel this invitation? ${cancelInviteTarget?.invited_email ?? "This person"} will not be able to join using this link.`}
        confirmLabel="Cancel invitation"
        loading={cancelling}
      />
    </>
  );
}
