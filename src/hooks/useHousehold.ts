"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Household, HouseholdMember, MemberRole } from "@/lib/types/database";

interface HouseholdWithMembers extends Household {
  household_members: (HouseholdMember & {
    profiles: { full_name: string; email: string; avatar_url: string | null } | null;
  })[];
}

interface UseHouseholdReturn {
  household: HouseholdWithMembers | null;
  members: (HouseholdMember & {
    profiles: { full_name: string; email: string; avatar_url: string | null } | null;
  })[];
  userRole: MemberRole | null;
  isLoading: boolean;
  error: string | null;
  canEdit: boolean;
  isOwner: boolean;
  refetch: () => void;
}

export function useHousehold(householdId: string): UseHouseholdReturn {
  const supabase = createClient();
  const [household, setHousehold] = useState<HouseholdWithMembers | null>(null);
  const [userRole, setUserRole] = useState<MemberRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data, error: err } = await supabase
        .from("households")
        .select(`*, household_members(*, profiles(full_name, email, avatar_url))`)
        .eq("id", householdId)
        .single();

      if (err) {
        setError(err.message);
      } else {
        setHousehold(data as HouseholdWithMembers);
        const myMembership = (data as HouseholdWithMembers).household_members.find(
          (m) => m.user_id === user.id
        );
        setUserRole(myMembership?.role ?? null);
      }
      setIsLoading(false);
    }
    fetch();
  }, [householdId, tick, supabase]);

  const members = household?.household_members ?? [];
  const canEdit = userRole === "owner" || userRole === "editor";
  const isOwner = userRole === "owner";

  return {
    household,
    members,
    userRole,
    isLoading,
    error,
    canEdit,
    isOwner,
    refetch: () => setTick((t) => t + 1),
  };
}
