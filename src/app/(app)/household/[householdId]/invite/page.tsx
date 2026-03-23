"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check, CheckCircle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";

export default function InvitePage() {
  const params = useParams<{ householdId: string }>();
  const { householdId } = params;
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [existingToken, setExistingToken] = useState<string | null>(null);
  const [existingLinkCopied, setExistingLinkCopied] = useState(false);

  // Check role on mount; redirect non-editors/owners
  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: member } = await supabase
        .from("household_members")
        .select("role")
        .eq("household_id", householdId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) { router.replace(`/household/${householdId}`); return; }
      if (member.role === "viewer" || member.role === "emergency_only") {
        router.replace(`/household/${householdId}`);
      }
    }
    checkRole();
  }, [householdId]); // eslint-disable-line react-hooks/exhaustive-deps

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setError(null);
    setExistingToken(null);

    if (!email.trim()) { setEmailError("Email address is required."); return; }
    if (!emailRegex.test(email.trim())) { setEmailError("Please enter a valid email address."); return; }

    setLoading(true);

    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId, email: email.trim(), role }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    if (data.existingToken) {
      setExistingToken(data.existingToken);
      return;
    }

    setInviteToken(data.inviteToken);
    setEmailSent(data.emailSent === true);
  }

  const inviteLink = inviteToken
    ? `${window.location.origin}/invite/accept?token=${inviteToken}`
    : null;

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    addToast("Link copied.", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyExisting() {
    if (!existingToken) return;
    const link = `${window.location.origin}/invite/accept?token=${existingToken}`;
    await navigator.clipboard.writeText(link);
    setExistingLinkCopied(true);
    addToast("Link copied.", "success");
    setTimeout(() => setExistingLinkCopied(false), 2000);
  }

  function resetForm() {
    setInviteToken(null);
    setEmailSent(false);
    setEmail("");
    setRole("viewer");
    setError(null);
    setEmailError(null);
    setExistingToken(null);
    setCopied(false);
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

      {!inviteToken ? (
        <>
          <h1 className="text-2xl font-bold text-warmstone-900 mb-6 hidden md:block">Invite someone</h1>

          {error && (
            <div className="mb-4">
              <Alert type="error" description={error} />
            </div>
          )}

          {existingToken && (
            <div className="mb-4">
              <Alert type="info" title="Invitation already sent">
                <p className="text-sm text-warmstone-800 mt-1 mb-3">
                  An invitation has already been sent to this address.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyExisting}
                >
                  {existingLinkCopied ? <Check size={14} /> : <Copy size={14} />}
                  {existingLinkCopied ? "Copied" : "Copy existing link"}
                </Button>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(null); setExistingToken(null); }}
              required
              error={emailError ?? undefined}
              placeholder="name@example.com"
              autoComplete="email"
            />
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            >
              <option value="editor">Editor (can add and edit records)</option>
              <option value="viewer">Viewer (can view records only)</option>
            </Select>
            <Button type="submit" loading={loading} fullWidth>
              Send invite
            </Button>
          </form>
        </>
      ) : (
        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex flex-col items-center gap-4">
          <CheckCircle size={32} className="text-sage-400" />
          <h2 className="font-bold text-warmstone-900 text-xl mt-3 mb-1 text-center">Invitation created</h2>

          {emailSent ? (
            <div className="flex items-center gap-2 text-sm text-sage-700 bg-sage-50 border border-sage-100 rounded-lg px-4 py-2.5 w-full">
              <Mail size={15} className="shrink-0" />
              <span>An email has been sent to <strong>{email}</strong></span>
            </div>
          ) : (
            <p className="text-sm text-warmstone-600 text-center mb-1">
              Share this link with the person you invited. It expires in 7 days.
            </p>
          )}

          <div className="w-full">
            <div className="bg-warmstone-50 border border-warmstone-200 rounded-md px-3 py-2.5 text-sm font-mono text-warmstone-800 break-all w-full">
              {inviteLink}
            </div>
          </div>

          <Button onClick={handleCopy} fullWidth>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy link"}
          </Button>

          <Button variant="ghost" onClick={resetForm} fullWidth>
            Send another invite
          </Button>

          <Link
            href={`/household/${householdId}/members`}
            className="text-sm text-warmstone-500 hover:text-warmstone-900 transition-colors"
          >
            Back to members
          </Link>
        </div>
      )}
    </div>
  );
}
