import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/email";
import type { MemberRole } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { householdId, email, role } = body as {
    householdId: string;
    email: string;
    role: "editor" | "viewer";
  };

  if (!householdId || !email || !role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const svc = await createServiceClient();

  // Verify caller is owner or editor
  const { data: callerMembership } = await svc
    .from("household_members")
    .select("role, profiles(full_name)")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .maybeSingle() as unknown as {
      data: { role: MemberRole; profiles: { full_name: string } | null } | null;
    };

  if (!callerMembership || (callerMembership.role !== "owner" && callerMembership.role !== "editor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: household } = await svc
    .from("households")
    .select("name")
    .eq("id", householdId)
    .single();

  if (!household) {
    return NextResponse.json({ error: "Household not found" }, { status: 404 });
  }

  // Check not already a member (by email via profiles)
  const { data: existingMembers } = await svc
    .from("household_members")
    .select("id, profiles(email)")
    .eq("household_id", householdId) as unknown as {
      data: { id: string; profiles: { email: string } | null }[] | null;
    };

  if (existingMembers?.some((m) => m.profiles?.email?.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "This person is already a member of this household." }, { status: 409 });
  }

  // Check for existing pending invite
  const now = new Date().toISOString();
  const { data: existingInvite } = await svc
    .from("invitations")
    .select("invite_token")
    .eq("household_id", householdId)
    .eq("invited_email", email.toLowerCase())
    .is("accepted_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json({ existingToken: existingInvite.invite_token });
  }

  // Create invitation
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error: insertError } = await svc
    .from("invitations")
    .insert({
      household_id: householdId,
      invited_email: email.toLowerCase(),
      role: role as MemberRole,
      invited_by: user.id,
      invite_token: token,
      expires_at: expiresAt,
    })
    .select("invite_token")
    .single();

  if (insertError || !invite) {
    console.error("Failed to create invitation:", insertError);
    return NextResponse.json({ error: "Failed to create invitation." }, { status: 500 });
  }

  // Send email
  const inviteLink = `${request.nextUrl.origin}/invite/accept?token=${invite.invite_token}`;
  const inviterName = callerMembership.profiles?.full_name ?? "Someone";

  try {
    await sendInviteEmail({
      to: email,
      householdName: household.name,
      inviterName,
      role,
      inviteLink,
    });
  } catch (emailError) {
    // Invitation was created; log email failure but don't fail the request
    console.error("Failed to send invite email:", emailError);
    return NextResponse.json({ inviteToken: invite.invite_token, emailSent: false });
  }

  return NextResponse.json({ inviteToken: invite.invite_token, emailSent: true });
}
