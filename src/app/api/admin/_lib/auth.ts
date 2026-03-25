import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Verifies that the requesting user is an authenticated admin.
 * Returns { svc } on success, or a NextResponse 401/403 on failure.
 */
export async function requireAdmin(): Promise<
  | { ok: true; svc: Awaited<ReturnType<typeof createServiceClient>>; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorised" }, { status: 401 }),
    };
  }

  const svc = await createServiceClient();

  const { data: profile } = await svc
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.account_type !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, svc, userId: user.id };
}
