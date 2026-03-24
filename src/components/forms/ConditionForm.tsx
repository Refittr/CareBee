"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import { trackFeatureUsage } from "@/lib/utils/analytics";
import type { Condition } from "@/lib/types/database";

interface ConditionFormProps {
  householdId: string;
  personId: string;
  condition?: Condition;
  onSaved: () => void;
  onCancel: () => void;
}

export function ConditionForm({ householdId, personId, condition, onSaved, onCancel }: ConditionFormProps) {
  const supabase = createClient();
  const { addToast } = useAppToast();
  const [fields, setFields] = useState({
    name: condition?.name ?? "",
    date_diagnosed: condition?.date_diagnosed ?? "",
    diagnosed_by: condition?.diagnosed_by ?? "",
    diagnosed_at_location: condition?.diagnosed_at_location ?? "",
    current_status: condition?.current_status ?? "",
    notes: condition?.notes ?? "",
    is_active: condition?.is_active ?? true,
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof fields, value: string | boolean) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.name.trim()) { setNameError("Condition name is required."); return; }
    setNameError(null);
    setError(null);
    setLoading(true);

    const payload = {
      person_id: personId,
      household_id: householdId,
      name: fields.name.trim(),
      date_diagnosed: fields.date_diagnosed || null,
      diagnosed_by: fields.diagnosed_by || null,
      diagnosed_at_location: fields.diagnosed_at_location || null,
      current_status: fields.current_status || null,
      notes: fields.notes || null,
      is_active: fields.is_active,
    };

    const { error: err } = condition
      ? await supabase.from("conditions").update(payload).eq("id", condition.id)
      : await supabase.from("conditions").insert(payload);

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      void trackFeatureUsage("conditions", condition ? "condition_updated" : "condition_added", "person", personId);
      addToast(condition ? "Condition updated." : "Condition added.", "success");
      onSaved();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert type="error" description={error} />}
      <Input label="Condition name" value={fields.name} onChange={(e) => set("name", e.target.value)} required error={nameError ?? undefined} />
      <Input label="Date diagnosed" type="date" value={fields.date_diagnosed} onChange={(e) => set("date_diagnosed", e.target.value)} />
      <Input label="Diagnosed by" value={fields.diagnosed_by} onChange={(e) => set("diagnosed_by", e.target.value)} placeholder="e.g. Dr Smith" />
      <Input label="Diagnosed at" value={fields.diagnosed_at_location} onChange={(e) => set("diagnosed_at_location", e.target.value)} placeholder="e.g. Royal Victoria Hospital" />
      <Input label="Current status" value={fields.current_status} onChange={(e) => set("current_status", e.target.value)} placeholder="e.g. Stable, under review" />
      <Textarea label="Notes" value={fields.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input type="checkbox" checked={fields.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 accent-honey-400" />
        <span className="text-sm font-semibold text-warmstone-800">Active condition</span>
      </label>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}
