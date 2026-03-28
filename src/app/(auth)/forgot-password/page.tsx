"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-12">
      <Link
        href="/login"
        className="absolute top-4 left-4 flex items-center gap-1 text-sm text-warmstone-500 hover:text-warmstone-900 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to sign in
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-warmstone-600 text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-6">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <CheckCircle size={36} className="text-sage-400" />
              <div>
                <p className="font-semibold text-warmstone-900 mb-1">Check your email</p>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  If an account exists for{" "}
                  <span className="font-medium text-warmstone-800">{email}</span>,
                  we&apos;ve sent a reset link. Check your inbox and spam folder.
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm text-honey-600 font-semibold hover:underline mt-1"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4">
                  <Alert type="error" description={error} />
                </div>
              )}
              <p className="text-sm text-warmstone-600 mb-5 leading-relaxed">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
                <Button type="submit" loading={loading} fullWidth>
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
