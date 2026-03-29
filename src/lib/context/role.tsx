"use client";

import { createContext, useContext } from "react";
import type { MemberRole } from "@/lib/types/database";

interface RoleContextValue {
  role: MemberRole;
  isLocked: boolean;
}

const RoleContext = createContext<RoleContextValue>({ role: "viewer", isLocked: false });

export function RoleProvider({
  role,
  isLocked = false,
  children,
}: {
  role: MemberRole;
  isLocked?: boolean;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={{ role, isLocked }}>{children}</RoleContext.Provider>;
}

/** Returns the current user's role in this household. */
export function useRole(): MemberRole {
  return useContext(RoleContext).role;
}

/** True if the current user can create, edit or delete records in this household. */
export function useCanEdit(): boolean {
  const { role, isLocked } = useContext(RoleContext);
  if (isLocked) return false;
  return role === "owner" || role === "editor";
}

/** True if this household is locked (owner's plan has lapsed). */
export function useIsLocked(): boolean {
  return useContext(RoleContext).isLocked;
}
