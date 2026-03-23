import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import type { AccountType } from "@/lib/types/database";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { userId } = await params;
  const body = await request.json();
  const { account_type } = body as { account_type: AccountType };

  const validTypes: AccountType[] = ["standard", "tester", "admin"];
  if (!validTypes.includes(account_type)) {
    return NextResponse.json({ error: "Invalid account_type" }, { status: 400 });
  }

  const { error } = await svc
    .from("profiles")
    .update({ account_type })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
