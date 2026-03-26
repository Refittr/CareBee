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
  const { full_name, email, account_type } = body as {
    full_name?: string;
    email?: string;
    account_type?: AccountType;
  };

  const profileUpdate: Record<string, unknown> = {};
  if (full_name !== undefined) profileUpdate.full_name = full_name.trim();
  if (account_type !== undefined) profileUpdate.account_type = account_type;
  if (email !== undefined) profileUpdate.email = email.trim().toLowerCase();

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await svc.from("profiles").update(profileUpdate).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (email !== undefined) {
    const { error } = await svc.auth.admin.updateUserById(userId, {
      email: email.trim().toLowerCase(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc, userId: adminId } = auth;

  const { userId } = await params;

  if (userId === adminId) {
    return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  const { error } = await svc.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
