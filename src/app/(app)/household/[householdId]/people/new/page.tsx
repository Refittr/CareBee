"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import { logActivity } from "@/lib/logActivity";
import { getCapabilities } from "@/lib/plan-utils";
import { markChecklistStep } from "@/lib/utils/checklist";
import type { AccountType, UserType, PlanType } from "@/lib/types/database";

export default function NewPersonPageWrapper() {
  return (
    <Suspense>
      <NewPersonPage />
    </Suspense>
  );
}

function NewPersonPage() {
  const router = useRouter();
  const params = useParams<{ householdId: string }>();
  const householdId = params.householdId;
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [gated, setGated] = useState(false);

  const [fields, setFields] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    nhs_number: "",
    gp_surgery: "",
    gp_name: "",
  });
  const [errors, setErrors] = useState<Partial<typeof fields>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOnboarding) return;
    supabase
      .from("households")
      .select("name")
      .eq("id", householdId)
      .maybeSingle()
      .then(({ data }) => setHouseholdName(data?.name ?? null));
  }, [isOnboarding, householdId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function checkGate() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: hh }, { count }] = await Promise.all([
        supabase.from("profiles").select("account_type, user_type, plan, is_subscribed, trial_ends_at").eq("id", user.id).single(),
        supabase.from("households").select("subscription_status, trial_ends_at, subscription_ends_at").eq("id", householdId).maybeSingle(),
        supabase.from("people").select("id", { count: "exact", head: true }).eq("household_id", householdId),
      ]);
      if (!profile) return;
      const caps = getCapabilities(
        { account_type: profile.account_type as AccountType, user_type: profile.user_type as UserType | null, plan: profile.plan as PlanType | null, is_subscribed: profile.is_subscribed, trial_ends_at: profile.trial_ends_at },
        hh ? { subscription_status: hh.subscription_status, trial_ends_at: hh.trial_ends_at, subscription_ends_at: (hh as { subscription_ends_at?: string | null }).subscription_ends_at } : null,
      );
      if (caps.maxPeople !== null && (count ?? 0) >= caps.maxPeople) {
        setGated(true);
      }
    }
    checkGate();
  }, [householdId]); // eslint-disable-line react-hooks/exhaustive-deps

  function validate() {
    const e: Partial<typeof fields> = {};
    if (!fields.first_name.trim()) e.first_name = "First name is required.";
    if (!fields.last_name.trim()) e.last_name = "Last name is required.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data, error: err } = await supabase
      .from("people")
      .insert({
        household_id: householdId,
        first_name: fields.first_name.trim(),
        last_name: fields.last_name.trim(),
        date_of_birth: fields.date_of_birth || null,
        nhs_number: fields.nhs_number || null,
        gp_surgery: fields.gp_surgery || null,
        gp_name: fields.gp_name || null,
        hospital_numbers: [],
        dnacpr_status: false,
      })
      .select("id")
      .single();

    if (err || !data) {
      setSubmitError(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    } else {
      await logActivity("person_added", "person", data.id, { household_id: householdId });
      void markChecklistStep("add_person");
      addToast(`Added ${fields.first_name} to your care record.`, "success");
      router.push(`/household/${householdId}/people/${data.id}`);
    }
  }

  function setField(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  if (gated) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-lg">
        <Header title="Add someone you care for" showBack backHref={`/household/${householdId}`} />
        <div className="mt-6 bg-honey-50 border border-honey-200 rounded-xl p-6 flex flex-col gap-3">
          <p className="font-semibold text-warmstone-900">Upgrade required</p>
          <p className="text-sm text-warmstone-700 leading-relaxed">
            Your current plan includes one person per care record. Subscribe to CareBee Plus to add more people, invite carers, and access all features.
          </p>
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-honey-700 hover:text-honey-900 transition-colors">
            View plans
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-lg">
      <Header title="Add someone you care for" showBack backHref={`/household/${householdId}`} />
      <Breadcrumbs
        items={[
          { label: "Your care records", href: "/dashboard" },
          { label: "Care record", href: `/household/${householdId}` },
          { label: "Add a person" },
        ]}
      />
      <h1 className="text-2xl font-bold text-warmstone-900 mb-6 hidden md:block">Add someone you care for</h1>

      {isOnboarding && (
        <div className="mb-5 bg-honey-50 border border-honey-200 rounded-lg px-4 py-3">
          <p className="text-sm text-honey-800 leading-relaxed">
            {householdName
              ? `You're setting up ${householdName}.`
              : "You're setting up your care record."}{" "}
            Add the first person you're caring for to get started.
          </p>
        </div>
      )}

      {submitError && (
        <div className="mb-4">
          <Alert type="error" description={submitError} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            value={fields.first_name}
            onChange={(e) => setField("first_name", e.target.value)}
            required
            error={errors.first_name}
            autoFocus
          />
          <Input
            label="Last name"
            value={fields.last_name}
            onChange={(e) => setField("last_name", e.target.value)}
            required
            error={errors.last_name}
          />
        </div>

        <Input
          label="Date of birth"
          type="date"
          value={fields.date_of_birth}
          onChange={(e) => setField("date_of_birth", e.target.value)}
        />

        <Input
          label="NHS number"
          value={fields.nhs_number}
          onChange={(e) => setField("nhs_number", e.target.value)}
          placeholder="123 456 7890"
          hint="You can find this on any letter from the NHS"
        />

        <Input
          label="GP surgery"
          value={fields.gp_surgery}
          onChange={(e) => setField("gp_surgery", e.target.value)}
          placeholder="e.g. Riverside Medical Centre"
        />

        <Input
          label="GP name"
          value={fields.gp_name}
          onChange={(e) => setField("gp_name", e.target.value)}
          placeholder="e.g. Dr Smith"
        />

        <Button type="submit" loading={loading} fullWidth>
          Save and continue
        </Button>
      </form>
    </div>
  );
}
