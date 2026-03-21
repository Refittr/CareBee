"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import type { Allergy } from "@/lib/types/database";

interface AllergyFormProps {
  householdId: string;
  personId: string;
  allergy?: Allergy;
  onSaved: () => void;
  onCancel: () => void;
}

export function AllergyForm({ householdId, personId, allergy, onSaved, onCancel }: AllergyFormProps) {
  const supabase = createClient();
  const { addToast } = useAppToast();
  const [fields, setFields] = useState({
    name: allergy?.name ?? "",
    reaction: allergy?.reaction ?? "",
    severity: allergy?.severity ?? "",
    notes: allergy?.notes ?? "",
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.name.trim()) { setNameError("Allergy name is required."); return; }
    setNameError(null); setError(null); setLoading(true);

    const payload = {
      person_id: personId,
      household_id: householdId,
      name: fields.name.trim(),
      reaction: fields.reaction || null,
      severity: fields.severity || null,
      notes: fields.notes || null,
    };

    const { error: err } = allergy
      ? await supabase.from("allergies").update(payload).eq("id", allergy.id)
      : await supabase.from("allergies").insert(payload);

    if (err) { setError(err.message); setLoading(false); }
    else { addToast(allergy ? "Allergy updated." : "Allergy added.", "success"); onSaved(); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert type="error" description={error} />}
      <Input label="Allergy" value={fields.name} onChange={(e) => set("name", e.target.value)} required error={nameError ?? undefined} placeholder="e.g. Penicillin" />
      <Input label="Reaction" value={fields.reaction} onChange={(e) => set("reaction", e.target.value)} placeholder="What happens?" />
      <Select label="Severity" value={fields.severity} onChange={(e) => set("severity", e.target.value)}>
        <option value="">Select severity</option>
        <option value="Mild">Mild</option>
        <option value="Moderate">Moderate</option>
        <option value="Severe">Severe</option>
      </Select>
      <Textarea label="Notes" value={fields.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}
