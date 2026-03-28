"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserType } from "@/lib/types/database";
import { getLabels, type AppLabels } from "@/lib/labels";

interface UserTypeContextValue {
  userType: UserType | null;
  labels: AppLabels;
  isSelfCare: boolean;
  loaded: boolean;
}

const UserTypeContext = createContext<UserTypeContextValue>({
  userType: null,
  labels: getLabels(null),
  isSelfCare: false,
  loaded: false,
});

export function UserTypeProvider({ children }: { children: React.ReactNode }) {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loaded, setLoaded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }

      const { data } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) {
        // Profile is missing — trigger failed or user bypassed email confirmation.
        // Create it now so nothing downstream breaks.
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email ?? "",
          full_name:
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            "",
          account_type: "standard" as const,
          plan: "free" as const,
          ai_uses_count: 0,
          is_subscribed: false,
        }, { onConflict: "id" });
      }

      setUserType((data?.user_type as UserType | null) ?? null);
      setLoaded(true);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const labels = getLabels(userType);
  const isSelfCare = userType === "self_care";

  return (
    <UserTypeContext.Provider value={{ userType, labels, isSelfCare, loaded }}>
      {children}
    </UserTypeContext.Provider>
  );
}

export function useUserType(): UserTypeContextValue {
  return useContext(UserTypeContext);
}
