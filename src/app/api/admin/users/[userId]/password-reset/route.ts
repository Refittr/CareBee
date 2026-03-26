import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;

  const { userId } = await params;

  const { data: profile } = await svc
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { data, error } = await svc.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login` },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to generate reset link." },
      { status: 500 }
    );
  }

  await sendPasswordResetEmail({
    to: profile.email,
    name: profile.full_name ?? "there",
    resetLink: data.properties.action_link,
  });

  return NextResponse.json({ ok: true });
}
