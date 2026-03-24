"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, CheckCircle, ArrowRight } from "lucide-react";
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

export default function SettingsPage() {
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [memberships, setMemberships] = useState<HouseholdMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [fullNameSaved, setFullNameSaved] = useState("");
  const [savingName, setSavingName] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: profile }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("email, full_name").eq("id", user.id).single(),
      supabase.from("household_members")
        .select("household_id, weekly_digest_enabled, weekly_digest_day, last_digest_sent_at")
        .eq("user_id", user.id)
        .not("accepted_at", "is", null),
    ]);

    setEmail(profile?.email ?? null);
    setFullName(profile?.full_name ?? "");
    setFullNameSaved(profile?.full_name ?? "");

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
      .update({ weekly_digest_enabled: enabled, updated_at: new Date().toISOString() })
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
      .update({ weekly_digest_day: day, updated_at: new Date().toISOString() })
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

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-warmstone-900">Weekly updates</h2>
          <p className="text-sm text-warmstone-600 mt-0.5">
            Receive a weekly email summary of changes across your care records.
          </p>
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
