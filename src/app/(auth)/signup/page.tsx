"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bug } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleGoogleSignUp() {
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
            <Bug size={32} className="text-honey-400" />
          </div>
          <h1 className="font-display text-3xl text-warmstone-900">CareBee</h1>
          <p className="text-warmstone-600 text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-4">
              <Alert type="error" description={error} />
            </div>
          )}
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <Input
              label="Full name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              autoComplete="name"
            />
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
              placeholder="Choose a password"
              required
              autoComplete="new-password"
            />
            <Button type="submit" loading={loading} fullWidth className="mt-1">
              Create account
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
            onClick={handleGoogleSignUp}
            type="button"
          >
            Sign up with Google
          </Button>
        </div>

        <p className="text-center text-sm text-warmstone-600 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-honey-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
