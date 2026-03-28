"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import type { Person } from "@/lib/types/database";

export function PersonEditForm({ person, onSaved }: { person: Person; onSaved: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const { addToast } = useAppToast();
  const [dailyCareEnabled, setDailyCareEnabled] = useState(person.daily_care_enabled ?? false);
  const [fields, setFields] = useState({
    first_name: person.first_name,
    last_name: person.last_name,
    date_of_birth: person.date_of_birth ?? "",
    nhs_number: person.nhs_number ?? "",
    gp_surgery: person.gp_surgery ?? "",
    gp_name: person.gp_name ?? "",
    next_of_kin_name: person.next_of_kin_name ?? "",
    next_of_kin_phone: person.next_of_kin_phone ?? "",
    next_of_kin_relationship: person.next_of_kin_relationship ?? "",
    notes: person.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [togglingDailyCare, setTogglingDailyCare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleDailyCare() {
    setTogglingDailyCare(true);
    const next = !dailyCareEnabled;
    const { error: err } = await supabase
      .from("people")
      .update({ daily_care_enabled: next })
      .eq("id", person.id);
    if (err) {
      addToast(err.message, "error");
    } else {
      setDailyCareEnabled(next);
      addToast(next ? "Daily care records enabled." : "Daily care records disabled.", "success");
      router.refresh();
    }
    setTogglingDailyCare(false);
  }

  function setField(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.first_name.trim() || !fields.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase
      .from("people")
      .update({
        first_name: fields.first_name.trim(),
        last_name: fields.last_name.trim(),
        date_of_birth: fields.date_of_birth || null,
        nhs_number: fields.nhs_number || null,
        gp_surgery: fields.gp_surgery || null,
        gp_name: fields.gp_name || null,
        next_of_kin_name: fields.next_of_kin_name || null,
        next_of_kin_phone: fields.next_of_kin_phone || null,
        next_of_kin_relationship: fields.next_of_kin_relationship || null,
        notes: fields.notes || null,
      })
      .eq("id", person.id);
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      addToast("Details updated.", "success");
      router.refresh();
      onSaved();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert type="error" description={error} />}
      <div className="grid grid-cols-2 gap-4">
        <Input label="First name" value={fields.first_name} onChange={(e) => setField("first_name", e.target.value)} required />
        <Input label="Last name" value={fields.last_name} onChange={(e) => setField("last_name", e.target.value)} required />
      </div>
      <Input label="Date of birth" type="date" value={fields.date_of_birth} onChange={(e) => setField("date_of_birth", e.target.value)} />
      <Input label="NHS number" value={fields.nhs_number} onChange={(e) => setField("nhs_number", e.target.value)} placeholder="123 456 7890" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="GP surgery" value={fields.gp_surgery} onChange={(e) => setField("gp_surgery", e.target.value)} />
        <Input label="GP name" value={fields.gp_name} onChange={(e) => setField("gp_name", e.target.value)} />
      </div>
      <div className="border-t border-warmstone-100 pt-4">
        <p className="text-sm font-bold text-warmstone-900 mb-3">Next of kin</p>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <Input label="Name" value={fields.next_of_kin_name} onChange={(e) => setField("next_of_kin_name", e.target.value)} />
          <Input label="Relationship" value={fields.next_of_kin_relationship} onChange={(e) => setField("next_of_kin_relationship", e.target.value)} />
        </div>
        <Input label="Phone number" type="tel" value={fields.next_of_kin_phone} onChange={(e) => setField("next_of_kin_phone", e.target.value)} />
      </div>
      <Textarea label="Notes" value={fields.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Any other notes..." rows={3} />

      <div className="border-t border-warmstone-100 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-warmstone-800">Daily care records</p>
            <p className="text-xs text-warmstone-500 mt-1 max-w-sm">
              Turn on to keep a day-by-day log for this person. Useful when caring for someone
              with complex needs, or where multiple carers are involved. A link will appear in
              the tabs above when enabled.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={dailyCareEnabled}
            onClick={toggleDailyCare}
            disabled={togglingDailyCare}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
              dailyCareEnabled ? "bg-honey-400" : "bg-warmstone-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                dailyCareEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="submit" loading={loading}>Save changes</Button>
      </div>
    </form>
  );
}
