"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import { logActivity } from "@/lib/logActivity";
import Link from "next/link";

const PAID_PLANS = ["carebee_plus", "plus", "family", "custom", "self_care_standard", "self_care_plus"];

export default function NewHouseholdPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useAppToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkGate() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }

      const [{ data: profile }, { data: memberships }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, is_subscribed")
          .eq("id", user.id)
          .single(),
        supabase
          .from("household_members")
          .select("household_id, households(subscription_status, trial_ends_at)")
          .eq("user_id", user.id)
          .eq("role", "owner"),
      ]);

      if (!profile) { setChecking(false); return; }

      const isSubscribed = profile.is_subscribed ?? false;
      const onPaidPlan = PAID_PLANS.includes(profile.plan ?? "");

      const hasActiveTrial = (memberships ?? []).some((m) => {
        const hh = (m as unknown as { households: { subscription_status: string; trial_ends_at: string | null } | null }).households;
        return hh?.subscription_status === "trial" && hh.trial_ends_at && new Date(hh.trial_ends_at) > new Date();
      });

      const ownedCount = (memberships ?? []).length;

      if (!isSubscribed && !onPaidPlan && !hasActiveTrial && ownedCount >= 1) {
        setGated(true);
      }

      setChecking(false);
    }
    checkGate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setError(null);
    if (!name.trim()) {
      setNameError("Please enter a name for this care record.");
      return;
    }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase.rpc("create_household_with_owner", {
      household_name: name.trim(),
    });
    if (err || !data) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    } else {
      await logActivity("household_created", "household", data);
      addToast("Care record created.", "success");
      router.push(`/household/${data}/people/new?onboarding=true`);
    }
  }

  if (checking) return null;

  if (gated) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-lg">
        <Header title="New care record" showBack backHref="/dashboard" />
        <Breadcrumbs
          items={[
            { label: "Your care records", href: "/dashboard" },
            { label: "New care record" },
          ]}
        />
        <div className="mt-6 bg-honey-50 border border-honey-200 rounded-xl p-6 flex flex-col gap-3">
          <p className="font-semibold text-warmstone-900">CareBee Plus required</p>
          <p className="text-sm text-warmstone-700 leading-relaxed">
            Your current plan includes one care record. Subscribe to CareBee Plus to create additional care records, invite care team members, and access all features.
          </p>
          <Link
            href="/settings"
            className="inline-block bg-honey-400 text-white font-bold rounded-md px-4 py-2.5 text-sm hover:bg-honey-600 transition-colors text-center"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg">
      <Header title="New care record" showBack backHref="/dashboard" />
      <Breadcrumbs
        items={[
          { label: "Your care records", href: "/dashboard" },
          { label: "New care record" },
        ]}
      />
      <h1 className="text-2xl font-bold text-warmstone-900 mb-6 hidden md:block">
        Create a care record
      </h1>
      {error && (
        <div className="mb-4">
          <Alert type="error" description={error} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Care record name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. James Jones Care, Mum's Records, Dad at Home"
          required
          error={nameError ?? undefined}
          hint="You can have multiple people in one care record and invite family or friends to view or edit it."
          autoFocus
        />
        <Button type="submit" loading={loading} fullWidth>
          Create care record
        </Button>
      </form>
    </div>
  );
}
