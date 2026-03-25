"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, BellOff, CheckCircle, ArrowRight, Sparkles, CreditCard } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Input, Select } from "@/components/ui/Input";
import { useAppToast } from "@/components/layout/AppShell";

const DAY_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

interface HouseholdMembership {
  household_id: string;
  household_name: string;
  weekly_digest_enabled: boolean;
  weekly_digest_day: string;
  last_digest_sent_at: string | null;
}

interface PlanInfo {
  plan: string;
  is_subscribed: boolean;
  trial_ends_at: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const supabase = createClient();
  const { addToast } = useAppToast();
  const searchParams = useSearchParams();

  const [memberships, setMemberships] = useState<HouseholdMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [fullNameSaved, setFullNameSaved] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "annual" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const statusParam = searchParams.get("status");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: profile }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("email, full_name, account_type, plan, is_subscribed, trial_ends_at, subscription_status, subscription_current_period_end").eq("id", user.id).single(),
      supabase.from("household_members")
        .select("household_id, weekly_digest_enabled, weekly_digest_day, last_digest_sent_at")
        .eq("user_id", user.id)
        .not("accepted_at", "is", null),
    ]);

    setEmail(profile?.email ?? null);
    setFullName(profile?.full_name ?? "");
    setFullNameSaved(profile?.full_name ?? "");
    setAccountType(profile?.account_type ?? null);
    if (profile) {
      setPlanInfo({
        plan: profile.plan ?? "family",
        is_subscribed: profile.is_subscribed ?? false,
        trial_ends_at: profile.trial_ends_at ?? null,
        subscription_status: profile.subscription_status ?? null,
        subscription_current_period_end: profile.subscription_current_period_end ?? null,
      });
    }

    if (!members || members.length === 0) { setLoading(false); return; }

    const householdIds = members.map((m) => m.household_id);
    const { data: households } = await supabase.from("households").select("id, name").in("id", householdIds);
    const nameMap = new Map((households ?? []).map((h) => [h.id, h.name]));

    setMemberships(
      members.map((m) => ({
        household_id: m.household_id,
        household_name: nameMap.get(m.household_id) ?? "Care record",
        weekly_digest_enabled: m.weekly_digest_enabled ?? false,
        weekly_digest_day: m.weekly_digest_day ?? "monday",
        last_digest_sent_at: m.last_digest_sent_at ?? null,
      }))
    );
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function toggleDigest(householdId: string, enabled: boolean) {
    setSaving(householdId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(null); return; }

    const { error: err } = await supabase
      .from("household_members")
      .update({ weekly_digest_enabled: enabled })
      .eq("user_id", user.id)
      .eq("household_id", householdId);

    if (err) {
      addToast(err.message, "error");
    } else {
      addToast(enabled ? "Weekly updates turned on." : "Weekly updates turned off.", "success");
      setMemberships((prev) =>
        prev.map((m) => m.household_id === householdId ? { ...m, weekly_digest_enabled: enabled } : m)
      );
    }
    setSaving(null);
  }

  async function updateDay(householdId: string, day: string) {
    setSaving(householdId + "_day");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(null); return; }

    const { error: err } = await supabase
      .from("household_members")
      .update({ weekly_digest_day: day })
      .eq("user_id", user.id)
      .eq("household_id", householdId);

    if (err) {
      addToast(err.message, "error");
    } else {
      addToast("Digest day updated.", "success");
      setMemberships((prev) =>
        prev.map((m) => m.household_id === householdId ? { ...m, weekly_digest_day: day } : m)
      );
    }
    setSaving(null);
  }

  async function saveFullName() {
    if (!fullName.trim()) { addToast("Name cannot be empty.", "error"); return; }
    setSavingName(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingName(false); return; }
    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    if (err) {
      addToast(err.message, "error");
    } else {
      setFullNameSaved(fullName.trim());
      addToast("Name updated.", "success");
    }
    setSavingName(false);
  }

  async function startCheckout(plan: "monthly" | "annual") {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast(data.error ?? "Could not start checkout.", "error");
        setCheckoutLoading(null);
      }
    } catch {
      addToast("Could not start checkout.", "error");
      setCheckoutLoading(null);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast(data.error ?? "Could not open billing portal.", "error");
        setPortalLoading(false);
      }
    } catch {
      addToast("Could not open billing portal.", "error");
      setPortalLoading(false);
    }
  }

  function formatLastSent(date: string | null): string {
    if (!date) return "Not sent yet";
    return `Last sent ${new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
  }

  return (
    <div className="px-4 py-6 md:px-8 max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-warmstone-900">Settings</h1>
        <p className="text-sm text-warmstone-600 mt-0.5">Manage your account and notification preferences</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-warmstone-900">Your profile</h2>
          <p className="text-sm text-warmstone-600 mt-0.5">This name appears when you are listed as a member of a care record.</p>
        </div>
        {loading ? (
          <SkeletonLoader count={1} />
        ) : (
          <Card className="flex flex-col gap-4 p-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={saveFullName}
                loading={savingName}
                disabled={fullName.trim() === fullNameSaved || !fullName.trim()}
                size="sm"
              >
                Save name
              </Button>
            </div>
            {email && (
              <p className="text-sm text-warmstone-500">
                Signed in as <span className="font-medium text-warmstone-700">{email}</span>
              </p>
            )}
          </Card>
        )}
      </section>

      {accountType !== "admin" && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-warmstone-900">Your plan</h2>
            <p className="text-sm text-warmstone-600 mt-0.5">Manage your CareBee Plus subscription.</p>
          </div>

          {statusParam === "success" && (
            <div className="flex items-center gap-2 text-sm text-sage-800 bg-sage-50 border border-sage-200 rounded-lg px-4 py-3">
              <CheckCircle size={16} className="text-sage-500 shrink-0" />
              <span>You&apos;re now subscribed to CareBee Plus. Enjoy unlimited AI features!</span>
            </div>
          )}

          {loading ? (
            <SkeletonLoader count={1} />
          ) : accountType === "tester" ? (
            <Card className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-sage-500" />
                <span className="font-semibold text-warmstone-900">Tester account</span>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-sage-100 text-sage-800">Full access</span>
              </div>
              <p className="text-sm text-warmstone-500">You have full access to all CareBee features. No subscription needed.</p>
            </Card>
          ) : planInfo?.is_subscribed ? (
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-honey-500" />
                <span className="font-semibold text-warmstone-900">CareBee Plus</span>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-sage-100 text-sage-800">Active</span>
              </div>
              {planInfo.subscription_current_period_end && (
                <p className="text-xs text-warmstone-500">
                  {planInfo.subscription_status === "canceled"
                    ? `Access until ${new Date(planInfo.subscription_current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                    : `Renews ${new Date(planInfo.subscription_current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                </p>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 w-fit"
                onClick={openPortal}
                loading={portalLoading}
              >
                <CreditCard size={14} />
                Manage billing
              </Button>
            </Card>
          ) : (() => {
            const trialActive = planInfo?.trial_ends_at && new Date(planInfo.trial_ends_at) > new Date();
            const daysLeft = trialActive
              ? Math.max(0, Math.ceil((new Date(planInfo!.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : 0;
            return (
              <Card className="flex flex-col gap-4 p-4">
                {trialActive ? (
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-honey-500" />
                    <span className="font-semibold text-warmstone-900">Free trial</span>
                    <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-honey-100 text-honey-800">{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-warmstone-400" />
                    <span className="font-semibold text-warmstone-900">No active plan</span>
                    <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-warmstone-100 text-warmstone-600">Trial ended</span>
                  </div>
                )}
                <p className="text-sm text-warmstone-600">Subscribe to keep your AI features after your trial ends.</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={checkoutLoading === "monthly"}
                    disabled={checkoutLoading !== null}
                    onClick={() => startCheckout("monthly")}
                  >
                    Subscribe — £4.99 / month
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={checkoutLoading === "annual"}
                    disabled={checkoutLoading !== null}
                    onClick={() => startCheckout("annual")}
                  >
                    Subscribe — £44.99 / year
                    <span className="ml-1.5 text-xs font-normal text-white bg-white/20 rounded-full px-2 py-0.5">Save 25%</span>
                  </Button>
                </div>
              </Card>
            );
          })()}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-warmstone-900">Weekly updates</h2>
          <p className="text-sm text-warmstone-600 mt-0.5">
            Receive a weekly email summary of changes across your care records.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-warmstone-100 border border-warmstone-200 rounded-lg px-3 py-2 text-xs font-semibold text-warmstone-500">
          <span>🚧</span> Under construction: weekly emails are not sending yet.
        </div>

        {loading ? (
          <SkeletonLoader count={2} />
        ) : memberships.length === 0 ? (
          <Card className="text-center py-8">
            <BellOff size={28} className="mx-auto text-warmstone-300 mb-2" />
            <p className="text-sm text-warmstone-500">No care records found. Add a care record to enable weekly updates.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {memberships.map((m) => (
              <Card key={m.household_id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-warmstone-900">{m.household_name}</span>
                      {m.weekly_digest_enabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sage-100 text-sage-800">
                          <CheckCircle size={11} /> On
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warmstone-100 text-warmstone-600">
                          Off
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-warmstone-400 mt-0.5">{formatLastSent(m.last_digest_sent_at)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={m.weekly_digest_enabled ? "secondary" : "primary"}
                    onClick={() => toggleDigest(m.household_id, !m.weekly_digest_enabled)}
                    disabled={saving === m.household_id}
                    className="gap-1.5 shrink-0"
                  >
                    {m.weekly_digest_enabled ? (
                      <><BellOff size={14} /> Turn off</>
                    ) : (
                      <><Bell size={14} /> Turn on</>
                    )}
                  </Button>
                </div>

                {m.weekly_digest_enabled && (
                  <div className="border-t border-warmstone-100 pt-3 -mx-4 px-4">
                    <label className="text-sm font-medium text-warmstone-700 block mb-1.5">Send on</label>
                    <Select
                      value={m.weekly_digest_day}
                      onChange={(e) => updateDay(m.household_id, e.target.value)}
                      disabled={saving === m.household_id + "_day"}
                    >
                      {DAY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-warmstone-400">
          Weekly updates include a summary of new appointments, medication changes, test results, waiting list updates, and entitlement changes from the past 7 days. This is not medical advice.
        </p>

        <Link
          href="/updates"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-honey-600 hover:text-honey-800 transition-colors"
        >
          View past updates and generate a preview
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
