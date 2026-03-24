"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import { trackFeatureUsage } from "@/lib/utils/analytics";
import type { Appointment } from "@/lib/types/database";

interface AppointmentFormProps {
  householdId: string;
  personId: string;
  appointment?: Appointment;
  onSaved: () => void;
  onCancel: () => void;
  debriefOnly?: boolean;
}

export function AppointmentForm({ householdId, personId, appointment, onSaved, onCancel, debriefOnly }: AppointmentFormProps) {
  const supabase = createClient();
  const { addToast } = useAppToast();
  const [fields, setFields] = useState({
    title: appointment?.title ?? "",
    appointment_date: appointment?.appointment_date
      ? new Date(appointment.appointment_date).toISOString().slice(0, 16)
      : "",
    location: appointment?.location ?? "",
    professional_name: appointment?.professional_name ?? "",
    department: appointment?.department ?? "",
    trust_or_service: appointment?.trust_or_service ?? "",
    status: appointment?.status ?? "upcoming",
    what_was_discussed: appointment?.what_was_discussed ?? "",
    what_was_agreed: appointment?.what_was_agreed ?? "",
    follow_up: appointment?.follow_up ?? "",
  });
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let hasError = false;
    if (!fields.title.trim() && !debriefOnly) { setTitleError("Title is required."); hasError = true; }
    if (!fields.appointment_date && !debriefOnly) { setDateError("Date and time is required."); hasError = true; }
    if (hasError) return;
    setTitleError(null); setDateError(null); setError(null); setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      person_id: personId,
      household_id: householdId,
      title: fields.title.trim(),
      appointment_date: fields.appointment_date,
      location: fields.location || null,
      professional_name: fields.professional_name || null,
      department: fields.department || null,
      trust_or_service: fields.trust_or_service || null,
      status: fields.status as Appointment["status"],
      what_was_discussed: fields.what_was_discussed || null,
      what_was_agreed: fields.what_was_agreed || null,
      follow_up: fields.follow_up || null,
    };

    const { error: err } = appointment
      ? await supabase.from("appointments").update(payload).eq("id", appointment.id)
      : await supabase.from("appointments").insert(payload);

    if (err) { setError(err.message); setLoading(false); }
    else {
      void trackFeatureUsage("appointments", appointment ? "appointment_updated" : "appointment_added", "person", personId);
      addToast(appointment ? "Appointment updated." : "Appointment added.", "success");
      onSaved();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert type="error" description={error} />}
      {!debriefOnly && (
        <>
          <Input label="Title" value={fields.title} onChange={(e) => set("title", e.target.value)} required error={titleError ?? undefined} placeholder="e.g. Cardiology follow-up" />
          <Input label="Date and time" type="datetime-local" value={fields.appointment_date} onChange={(e) => set("appointment_date", e.target.value)} required error={dateError ?? undefined} />
          <Input label="Location" value={fields.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Royal Victoria Hospital" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Professional name" value={fields.professional_name} onChange={(e) => set("professional_name", e.target.value)} placeholder="e.g. Dr Smith" />
            <Input label="Department" value={fields.department} onChange={(e) => set("department", e.target.value)} />
          </div>
          <Input label="Trust or service" value={fields.trust_or_service} onChange={(e) => set("trust_or_service", e.target.value)} />
          <Select label="Status" value={fields.status} onChange={(e) => set("status", e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="missed">Missed</option>
          </Select>
        </>
      )}
      {(fields.status === "completed" || debriefOnly) && (
        <div className="border-t border-warmstone-100 pt-4 flex flex-col gap-4">
          {!debriefOnly && <p className="text-sm font-bold text-warmstone-900">Appointment notes</p>}
          <Textarea label="What was discussed" value={fields.what_was_discussed} onChange={(e) => set("what_was_discussed", e.target.value)} rows={3} />
          <Textarea label="What was agreed" value={fields.what_was_agreed} onChange={(e) => set("what_was_agreed", e.target.value)} rows={3} />
          <Textarea label="Follow-up actions" value={fields.follow_up} onChange={(e) => set("follow_up", e.target.value)} rows={2} />
        </div>
      )}
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}
