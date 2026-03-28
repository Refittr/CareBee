"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  }

  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-warmstone-600 text-sm mt-1">Choose a new password</p>
        </div>

        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-6">
          {done ? (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <CheckCircle size={36} className="text-sage-400" />
              <div>
                <p className="font-semibold text-warmstone-900 mb-1">Password updated</p>
                <p className="text-sm text-warmstone-600">Taking you to your dashboard...</p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4">
                  <Alert type="error" description={error} />
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  autoFocus
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  autoComplete="new-password"
                />
                <Button type="submit" loading={loading} fullWidth className="mt-1">
                  Update password
                </Button>
              </form>
              <p className="text-center text-sm text-warmstone-500 mt-4">
                <Link href="/login" className="hover:text-warmstone-900 transition-colors">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
