import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { sendConfirmationEmail } from "@/lib/email";

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.mycarebee.co.uk";

  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
    options: { redirectTo: `${appUrl}/dashboard` },
  });

  if (error) {
    console.error("[resend-confirmation] generateLink error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.properties?.action_link) {
    return NextResponse.json({ error: "Failed to generate confirmation link." }, { status: 500 });
  }

  try {
    await sendConfirmationEmail({
      to: profile.email,
      name: profile.full_name ?? "there",
      confirmLink: data.properties.action_link,
    });
  } catch (err) {
    console.error("[resend-confirmation] Email send failed:", err);
    return NextResponse.json({ error: "Link generated but email failed to send." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
