"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import type { MemberRole } from "@/lib/types/database";

export default function InvitePage() {
  const params = useParams<{ householdId: string }>();
  const { householdId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("viewer");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setEmailError("Email address is required."); return; }
    setEmailError(null); setError(null); setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: err } = await supabase.from("invitations").insert({
      household_id: householdId,
      invited_email: email.trim(),
      role,
      invited_by: user.id,
      invite_token: token,
      expires_at: expiresAt,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      const link = `${window.location.origin}/invite/accept?token=${token}`;
      setInviteLink(link);
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    addToast("Link copied.", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg">
      <Header title="Invite someone" showBack backHref={`/household/${householdId}/members`} />
      <Breadcrumbs items={[
        { label: "Your households", href: "/dashboard" },
        { label: "Household", href: `/household/${householdId}` },
        { label: "Members", href: `/household/${householdId}/members` },
        { label: "Invite" },
      ]} />
      <h1 className="text-2xl font-bold text-warmstone-900 mb-6 hidden md:block">Invite someone</h1>

      {error && <div className="mb-4"><Alert type="error" description={error} /></div>}

      {!inviteLink ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={emailError ?? undefined}
            placeholder="name@example.com"
          />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            <option value="editor">Editor (can add and edit records)</option>
            <option value="viewer">Viewer (can view records only)</option>
          </Select>
          <Button type="submit" loading={loading} fullWidth>Send invite</Button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <Alert type="success" title="Invite link created" description="Share this link with them. They will need to create an account or sign in to accept the invitation." />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-warmstone-800">Invite link</label>
            <div className="bg-warmstone-100 border border-warmstone-200 rounded-sm px-3 py-2.5 text-sm text-warmstone-800 break-all font-mono">
              {inviteLink}
            </div>
          </div>

          <Button onClick={handleCopy} fullWidth variant={copied ? "secondary" : "primary"}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy link"}
          </Button>

          <p className="text-sm text-warmstone-600">
            The link expires in 7 days. For MVP, this is a manual share. No email is sent.
          </p>

          <Button variant="ghost" onClick={() => { setInviteLink(null); setEmail(""); }} fullWidth>
            Invite another person
          </Button>
        </div>
      )}
    </div>
  );
}
