"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ReportIssueButton } from "@/components/auth/ReportIssueButton";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const safePath =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";
  const emailParam = searchParams.get("email");
  const typeParam = searchParams.get("type");
  const supabase = createClient();
  const [fullName, setFullName] = useState("");

  // If the user is already logged in, route them straight to onboarding
  // (which will update their type and redirect appropriately) rather than
  // showing the signup form again.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      if (typeParam) {
        router.replace(`/onboarding?type=${typeParam}`);
      } else {
        router.replace("/dashboard");
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (err) {
      const msg = err.message && err.message !== "{}" ? err.message : "Sign up failed. Please check your details and try again.";
      setError(msg);
      setLoading(false);
    } else if (data.user && (data.user.identities?.length ?? 1) === 0) {
      // Supabase returns a fake success for existing emails — detect via empty identities
      setError("An account with this email already exists. Please sign in instead.");
      setLoading(false);
    } else {
      if (typeParam) localStorage.setItem("carebee_signup_type", typeParam);
      router.push(`/signup-confirmation?email=${encodeURIComponent(email)}`);
    }
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safePath)}`,
      },
    });
  }

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
            <div>
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                readOnly={!!emailParam}
              />
              {emailParam && (
                <p className="text-xs text-warmstone-500 mt-1">This email was set by your invitation.</p>
              )}
            </div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
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
        <p className="text-center mt-3">
          <ReportIssueButton defaultName={fullName} defaultEmail={email} source="signup page" />
        </p>
      </div>
    </div>
  );
}
