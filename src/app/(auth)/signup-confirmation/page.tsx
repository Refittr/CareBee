"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, AlertCircle, ChevronLeft, CheckCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ReportIssueButton } from "@/components/auth/ReportIssueButton";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN = 60;

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const supabase = createClient();

  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const expiresAt = localStorage.getItem("resend_expires_at");
    if (!expiresAt) return;
    const remaining = Math.ceil((Number(expiresAt) - Date.now()) / 1000);
    if (remaining > 0) setCooldown(remaining);
  }, []);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email || cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setResendError("Could not resend. Please try again in a moment.");
    } else {
      setResendSuccess(true);
      const expiresAt = Date.now() + RESEND_COOLDOWN * 1000;
      localStorage.setItem("resend_expires_at", String(expiresAt));
      setCooldown(RESEND_COOLDOWN);
    }
    setResendLoading(false);
  }

  return (
    <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-8">
      <div className="flex justify-center mb-4">
        <Mail size={48} className="text-honey-500" />
      </div>

      <h1 className="text-xl font-bold text-warmstone-900 text-center mb-4">Check your email</h1>

      <p className="text-warmstone-700 text-sm mb-4 text-center">
        We&apos;ve sent a confirmation link to <span className="font-semibold">{email || "your email"}</span>
      </p>

      <div className="bg-sage-50 border border-sage-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle size={20} className="text-sage-600 shrink-0 mt-0.5" />
          <div className="text-sm text-sage-800">
            <p className="font-semibold mb-1">Don&apos;t see it?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your junk or spam folder</li>
              <li>The link expires after 24 hours</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Resend section */}
      <div className="text-center">
        {resendSuccess && (
          <div className="flex items-center justify-center gap-2 text-sm text-sage-700 mb-3">
            <CheckCircle size={15} className="shrink-0" />
            Email resent. Check your inbox.
          </div>
        )}
        {resendError && (
          <p className="text-sm text-error mb-3">{resendError}</p>
        )}

        <button
          onClick={handleResend}
          disabled={cooldown > 0 || resendLoading || !email}
          className="text-sm font-semibold text-honey-600 hover:text-honey-800 transition-colors disabled:text-warmstone-400 disabled:cursor-not-allowed"
        >
          {resendLoading
            ? "Sending..."
            : cooldown > 0
            ? `Resend email (${cooldown}s)`
            : "Resend confirmation email"}
        </button>
      </div>

      <p className="text-center mt-4">
        <ReportIssueButton defaultEmail={email ?? ""} source="signup confirmation page" />
      </p>
    </div>
  );
}

export default function SignupConfirmationPage() {
  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="absolute top-4 left-4 flex items-center gap-1 text-sm text-warmstone-500 hover:text-warmstone-900 transition-colors">
        <ChevronLeft size={16} />
        Back to home
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-warmstone-600 text-sm mt-1">Confirm your email</p>
        </div>

        <Suspense fallback={
          <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-8 text-center text-warmstone-400 text-sm">
            Loading...
          </div>
        }>
          <ConfirmationContent />
        </Suspense>

        <p className="text-center text-sm text-warmstone-600 mt-6">
          Already confirmed?{" "}
          <Link href="/login" className="text-honey-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
