"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import { trackFeatureUsage } from "@/lib/utils/analytics";
import { markChecklistStep } from "@/lib/utils/checklist";
import type { Medication, Condition } from "@/lib/types/database";

interface MedicationFormProps {
  householdId: string;
  personId: string;
  medication?: Medication;
  conditions: Pick<Condition, "id" | "name">[];
  onSaved: () => void;
  onCancel: () => void;
}

export function MedicationForm({ householdId, personId, medication, conditions, onSaved, onCancel }: MedicationFormProps) {
  const supabase = createClient();
  const { addToast } = useAppToast();
  const [fields, setFields] = useState({
    name: medication?.name ?? "",
    dosage: medication?.dosage ?? "",
    frequency: medication?.frequency ?? "",
    purpose: medication?.purpose ?? "",
    prescribed_by: medication?.prescribed_by ?? "",
    pharmacy: medication?.pharmacy ?? "",
    repeat_prescription_date: medication?.repeat_prescription_date ?? "",
    start_date: medication?.start_date ?? "",
    notes: medication?.notes ?? "",
    is_active: medication?.is_active ?? true,
    condition_id: medication?.condition_id ?? "",
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof fields, value: string | boolean) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.name.trim()) { setNameError("Medication name is required."); return; }
    setNameError(null); setError(null); setLoading(true);

    const payload = {
      person_id: personId,
      household_id: householdId,
      name: fields.name.trim(),
      dosage: fields.dosage || null,
      frequency: fields.frequency || null,
      purpose: fields.purpose || null,
      prescribed_by: fields.prescribed_by || null,
      pharmacy: fields.pharmacy || null,
      repeat_prescription_date: fields.repeat_prescription_date || null,
      start_date: fields.start_date || null,
      notes: fields.notes || null,
      is_active: fields.is_active,
      condition_id: fields.condition_id || null,
    };

    const { error: err } = medication
      ? await supabase.from("medications").update(payload).eq("id", medication.id)
      : await supabase.from("medications").insert(payload);

    if (err) { setError(err.message); setLoading(false); }
    else {
      void trackFeatureUsage("medications", medication ? "medication_updated" : "medication_added", "person", personId);
      if (!medication) void markChecklistStep("add_first_condition_or_med");
      addToast(medication ? "Medication updated." : "Medication added.", "success");
      onSaved();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert type="error" description={error} />}
      <Input label="Medication name" value={fields.name} onChange={(e) => set("name", e.target.value)} required error={nameError ?? undefined} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Dosage" value={fields.dosage} onChange={(e) => set("dosage", e.target.value)} placeholder="e.g. 5mg" />
        <Input label="Frequency" value={fields.frequency} onChange={(e) => set("frequency", e.target.value)} placeholder="e.g. once daily" />
      </div>
      {conditions.length > 0 && (
        <Select label="Linked condition" value={fields.condition_id} onChange={(e) => set("condition_id", e.target.value)}>
          <option value="">Not linked to a condition</option>
          {conditions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      )}
      <Textarea label="Purpose" value={fields.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="What is this medication for, in plain English?" rows={2} />
      <Input label="Prescribed by" value={fields.prescribed_by} onChange={(e) => set("prescribed_by", e.target.value)} placeholder="e.g. Dr Smith" />
      <Input label="Pharmacy" value={fields.pharmacy} onChange={(e) => set("pharmacy", e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Start date" type="date" value={fields.start_date} onChange={(e) => set("start_date", e.target.value)} />
        <Input label="Repeat prescription date" type="date" value={fields.repeat_prescription_date} onChange={(e) => set("repeat_prescription_date", e.target.value)} />
      </div>
      <Textarea label="Notes" value={fields.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input type="checkbox" checked={fields.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 accent-honey-400" />
        <span className="text-sm font-semibold text-warmstone-800">Currently taking</span>
      </label>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}
