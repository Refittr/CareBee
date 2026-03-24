"use client";

import { createContext, useContext } from "react";
import type { MemberRole } from "@/lib/types/database";

const RoleContext = createContext<MemberRole>("viewer");

export function RoleProvider({ role, children }: { role: MemberRole; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/** True if the current user can create, edit or delete records in this household. */
export function useCanEdit(): boolean {
  const role = useContext(RoleContext);
  return role === "owner" || role === "editor";
}
