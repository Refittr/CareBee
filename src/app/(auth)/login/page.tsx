"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BeeIcon } from "@/components/ui/BeeIcon";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import type { Metadata } from "next";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-warmstone-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <BeeIcon size={32} className="text-honey-400" />
          </div>
          <h1 className="font-display text-3xl text-warmstone-900">CareBee</h1>
          <p className="text-warmstone-600 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-4">
              <Alert type="error" description={error} />
            </div>
          )}
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
            <Button type="submit" loading={loading} fullWidth className="mt-1">
              Sign in
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-warmstone-200" />
            <span className="text-xs text-warmstone-400 font-semibold">or</span>
            <div className="flex-1 border-t border-warmstone-200" />
          </div>

          <Button
            variant="ghost"
            fullWidth
            loading={googleLoading}
            onClick={handleGoogleSignIn}
            type="button"
          >
            Sign in with Google
          </Button>
        </div>

        <p className="text-center text-sm text-warmstone-600 mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-honey-600 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
