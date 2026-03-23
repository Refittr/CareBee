"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

interface QRCodeDisplayProps {
  householdId: string;
  personId: string;
  personName: string;
}

export function QRCodeDisplay({ householdId, personId, personName }: QRCodeDisplayProps) {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadOrCreateShare();
  }, [personId]);

  async function loadOrCreateShare() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let { data: share } = await supabase
      .from("emergency_shares")
      .select("share_token")
      .eq("person_id", personId)
      .eq("is_active", true)
      .maybeSingle();

    if (!share) {
      const newToken = crypto.randomUUID();
      const { data: created } = await supabase
        .from("emergency_shares")
        .insert({
          person_id: personId,
          household_id: householdId,
          share_token: newToken,
          is_active: true,
          created_by: user.id,
        })
        .select("share_token")
        .single();
      share = created;
    }

    setToken(share?.share_token ?? null);
    setLoading(false);
  }

  const shareUrl = token
    ? `${window.location.origin}/emergency/${token}`
    : null;

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <SkeletonLoader variant="card" count={1} />;

  if (!shareUrl) return <p className="text-warmstone-600 text-sm">Could not generate link. Please try again.</p>;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-warmstone-600 text-center">
        Show this QR code or share the link with emergency services. Anyone with the link can view {personName}&apos;s emergency information.
      </p>
      <div className="p-3 bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm">
        <QRCodeSVG value={shareUrl} size={160} />
      </div>
      <div className="w-full flex flex-col gap-2">
        <p className="text-xs text-warmstone-400 text-center break-all">{shareUrl}</p>
        <Button variant="ghost" fullWidth onClick={handleCopy}>
          {copied ? <Check size={16} className="text-sage-400" /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
