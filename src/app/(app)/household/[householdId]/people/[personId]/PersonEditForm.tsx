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
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex gap-3 justify-end pt-2">
        <Button type="submit" loading={loading}>Save changes</Button>
      </div>
    </form>
  );
}
