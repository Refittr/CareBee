"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/Modal";
import { useAppToast } from "@/components/layout/AppShell";
import { getInitials } from "@/lib/utils/formatting";
import { formatDateUK } from "@/lib/utils/dates";
import type { MemberRole } from "@/lib/types/database";

type Member = {
  id: string;
  user_id: string;
  role: MemberRole;
  invited_email: string | null;
  created_at: string;
  profiles: { full_name: string; email: string; avatar_url: string | null } | null;
};

const roleVariant: Record<MemberRole, "owner" | "active" | "neutral" | "warning"> = {
  owner: "owner",
  editor: "active",
  viewer: "neutral",
  emergency_only: "warning",
};

const roleLabels: Record<MemberRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
  emergency_only: "Emergency only",
};

interface MembersClientProps {
  members: Member[];
  currentUserId: string;
  householdId: string;
  householdName: string;
}

export function MembersClient({ members, currentUserId, householdId, householdName }: MembersClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const { addToast } = useAppToast();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  const currentUserRole = members.find((m) => m.user_id === currentUserId)?.role;
  const isOwner = currentUserRole === "owner";

  async function handleRoleChange(memberId: string, role: MemberRole) {
    const { error } = await supabase.from("household_members").update({ role }).eq("id", memberId);
    if (error) addToast("Something went wrong. Please try again.", "error");
    else { addToast("Role updated.", "success"); router.refresh(); }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    const { error } = await supabase.from("household_members").delete().eq("id", removeTarget.id);
    if (error) addToast("Something went wrong. Please try again.", "error");
    else { addToast("Member removed.", "success"); setRemoveTarget(null); router.refresh(); }
    setRemoving(false);
  }

  return (
    <>
      <div className="flex flex-col gap-3 mb-6">
        {members.map((member) => {
          const name = member.profiles?.full_name ?? member.invited_email ?? "Unknown";
          const email = member.profiles?.email ?? member.invited_email ?? "";
          const isCurrentUser = member.user_id === currentUserId;
          return (
            <div key={member.id} className="bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-sage-100 flex items-center justify-center text-sage-800 font-bold text-sm shrink-0">
                {getInitials(name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-warmstone-900 truncate">{name}</p>
                  {isCurrentUser && <span className="text-xs text-warmstone-400">(you)</span>}
                </div>
                <p className="text-sm text-warmstone-400 truncate">{email}</p>
                <p className="text-xs text-warmstone-400">Joined {formatDateUK(member.created_at)}</p>
              </div>
              {isOwner && !isCurrentUser && member.role !== "owner" ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as MemberRole)}
                    className="text-sm py-1.5 min-h-[36px]"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                    <option value="emergency_only">Emergency only</option>
                  </Select>
                  <button
                    onClick={() => setRemoveTarget(member)}
                    className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              ) : (
                <Badge variant={roleVariant[member.role]}>{roleLabels[member.role]}</Badge>
              )}
            </div>
          );
        })}
      </div>

      <Link
        href={`/household/${householdId}/invite`}
        className="bg-honey-400 text-warmstone-white font-bold rounded-md px-6 py-3 text-base hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] inline-flex items-center gap-2 min-h-[44px]"
      >
        <Plus size={18} /> Invite someone
      </Link>

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove member"
        description={`Are you sure you want to remove ${removeTarget?.profiles?.full_name ?? removeTarget?.invited_email ?? "this member"} from ${householdName}?`}
        confirmLabel="Remove"
        loading={removing}
      />
    </>
  );
}
