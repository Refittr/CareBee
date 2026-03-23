"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center justify-center min-h-[44px] min-w-[44px] text-warmstone-500 hover:text-warmstone-900 transition-colors"
      aria-label="Sign out"
    >
      <LogOut size={20} />
    </button>
  );
}
