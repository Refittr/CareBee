"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAppToast } from "@/components/layout/AppShell";
import { useUserType } from "@/lib/context/UserTypeContext";
import { trackFeatureUsage } from "@/lib/utils/analytics";
import { markChecklistStep } from "@/lib/utils/checklist";
import type { Medication, Condition } from "@/lib/types/database";

interface MedicationFormProps {
  householdId: string;
  personId: string;
  medication?: Medication;
  conditions: Pick<Condition, "id" | "name">[];
  personFirstName?: string;
  onSaved: () => void;
  onCancel: () => void;
}

const MAX_TIMES = 10;

export function MedicationForm({ householdId, personId, medication, conditions, personFirstName, onSaved, onCancel }: MedicationFormProps) {
  const supabase = createClient();
  const { addToast } = useAppToast();
  const { isSelfCare } = useUserType();

  const [fields, setFields] = useState({
    name: medication?.name ?? "",
    dosage: medication?.dosage ?? "",
    frequency: medication?.frequency ?? "",
    purpose: medication?.purpose ?? "",
    prescribed_by: medication?.prescribed_by ?? "",
    pharmacy: medication?.pharmacy ?? "",
    start_date: medication?.start_date ?? "",
    end_date: medication?.end_date ?? "",
    notes: medication?.notes ?? "",
    is_active: medication?.is_active ?? true,
    condition_id: medication?.condition_id ?? "",
  });

  const [repeatPrescription, setRepeatPrescription] = useState(
    !!medication?.repeat_prescription_date
  );

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleType, setScheduleType] = useState<"specific_times" | "times_per_day">("specific_times");
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["08:00"]);
  const [timesPerDay, setTimesPerDay] = useState(3);

  // Fetch existing schedule data when editing
  useEffect(() => {
    if (!medication?.id) return;
    if (medication.schedule_type) {
      setScheduleEnabled(true);
      setScheduleType(medication.schedule_type);
      if (medication.times_per_day) setTimesPerDay(medication.times_per_day);
      if (medication.schedule_type === "specific_times") {
        supabase
          .from("medication_schedules")
          .select("time")
          .eq("medication_id", medication.id)
          .order("time")
          .then(({ data }) => {
            if (data && data.length > 0) {
              setScheduleTimes(data.map((s) => (s.time as string).slice(0, 5)));
            }
          });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch person first name if not provided
  const [personName, setPersonName] = useState<string | null>(personFirstName ?? null);
  useEffect(() => {
    if (personName !== null) return;
    supabase
      .from("people")
      .select("first_name")
      .eq("id", personId)
      .maybeSingle()
      .then(({ data }) => { if (data) setPersonName(data.first_name); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof fields, value: string | boolean) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function addTime() {
    if (scheduleTimes.length >= MAX_TIMES) return;
    setScheduleTimes((prev) => [...prev, "08:00"]);
  }

  function removeTime(idx: number) {
    setScheduleTimes((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTime(idx: number, value: string) {
    setScheduleTimes((prev) => prev.map((t, i) => (i === idx ? value : t)));
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
      repeat_prescription_date: repeatPrescription ? (fields.end_date || null) : null,
      start_date: fields.start_date || null,
      end_date: fields.end_date || null,
      notes: fields.notes || null,
      is_active: fields.is_active,
      condition_id: fields.condition_id || null,
      schedule_type: scheduleEnabled ? scheduleType : null,
      times_per_day: scheduleEnabled && scheduleType === "times_per_day" ? timesPerDay : null,
    };

    const medId = medication?.id;
    const { data: saved, error: err } = medId
      ? await supabase.from("medications").update(payload).eq("id", medId).select("id").single()
      : await supabase.from("medications").insert(payload).select("id").single();

    if (err) { setError(err.message); setLoading(false); return; }

    const savedId = saved?.id ?? medId;

    // Manage medication_schedules
    if (savedId) {
      if (!scheduleEnabled) {
        await supabase.from("medication_schedules").delete().eq("medication_id", savedId);
      } else if (scheduleType === "times_per_day") {
        await supabase.from("medication_schedules").delete().eq("medication_id", savedId);
      } else {
        // specific_times: replace all slots
        await supabase.from("medication_schedules").delete().eq("medication_id", savedId);
        const validTimes = scheduleTimes.filter(Boolean);
        if (validTimes.length > 0) {
          await supabase.from("medication_schedules").insert(
            validTimes.map((time) => ({ medication_id: savedId, time }))
          );
        }
      }
    }

    void trackFeatureUsage("medications", medication ? "medication_updated" : "medication_added", "person", personId);
    if (!medication) void markChecklistStep("add_first_condition_or_med");
    addToast(medication ? "Medication updated." : "Medication added.", "success");
    onSaved();
  }

  const scheduleHelperText = isSelfCare
    ? "Set a schedule to track this medication on your calendar"
    : personName
    ? `Set a schedule to track this medication on ${personName}'s calendar`
    : "Set a schedule to track this medication on the calendar";

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
        <Input label="End date" type="date" value={fields.end_date} onChange={(e) => set("end_date", e.target.value)} hint="Leave blank if ongoing" />
      </div>
      <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px] rounded-lg border border-warmstone-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-warmstone-800">Repeat prescription</p>
          <p className="text-xs text-warmstone-500">
            {repeatPrescription && fields.end_date
              ? `Reorder reminder set for ${new Date(fields.end_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
              : "Adds a reorder reminder on the end date"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRepeatPrescription((v) => !v)}
          className={`w-12 h-6 rounded-full transition-colors shrink-0 ${repeatPrescription ? "bg-honey-400" : "bg-warmstone-200"}`}
          aria-pressed={repeatPrescription}
        >
          <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${repeatPrescription ? "translate-x-6" : ""}`} />
        </button>
      </label>
      <Textarea label="Notes" value={fields.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input type="checkbox" checked={fields.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 accent-honey-400" />
        <span className="text-sm font-semibold text-warmstone-800">Currently taking</span>
      </label>

      {/* Schedule section */}
      <div className="border-t border-warmstone-100 pt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-warmstone-800">Add to calendar</p>
          <button
            type="button"
            onClick={() => setScheduleEnabled((v) => !v)}
            className={`w-12 h-6 rounded-full transition-colors ${scheduleEnabled ? "bg-honey-400" : "bg-warmstone-200"}`}
            aria-pressed={scheduleEnabled}
          >
            <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${scheduleEnabled ? "translate-x-6" : ""}`} />
          </button>
        </div>
        <p className="text-xs text-warmstone-500 mb-3">{scheduleHelperText}</p>

        {scheduleEnabled && (
          <div className="flex flex-col gap-4 bg-warmstone-50 rounded-lg p-4">
            {/* Schedule type toggle */}
            <div>
              <p className="text-xs font-semibold text-warmstone-700 mb-2">How do you want to set the schedule?</p>
              <div className="flex rounded-md overflow-hidden border border-warmstone-200">
                <button
                  type="button"
                  onClick={() => setScheduleType("specific_times")}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${scheduleType === "specific_times" ? "bg-honey-400 text-white" : "bg-warmstone-white text-warmstone-700 hover:bg-warmstone-100"}`}
                >
                  Set specific times
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType("times_per_day")}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors border-l border-warmstone-200 ${scheduleType === "times_per_day" ? "bg-honey-400 text-white" : "bg-warmstone-white text-warmstone-700 hover:bg-warmstone-100"}`}
                >
                  Just the number of times per day
                </button>
              </div>
            </div>

            {scheduleType === "specific_times" ? (
              <div className="flex flex-col gap-2">
                {scheduleTimes.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(idx, e.target.value)}
                      className="bg-warmstone-100 border border-warmstone-200 rounded-sm text-warmstone-800 px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-honey-200 flex-1"
                    />
                    {scheduleTimes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTime(idx)}
                        className="p-2 text-warmstone-400 hover:text-error transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Remove time"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {scheduleTimes.length < MAX_TIMES && (
                  <button
                    type="button"
                    onClick={addTime}
                    className="flex items-center gap-1.5 text-sm font-semibold text-honey-800 hover:text-honey-900 transition-colors min-h-[36px] self-start"
                  >
                    <Plus size={14} />
                    Add another time
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-warmstone-700 mb-2">How many times per day?</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTimesPerDay((n) => Math.max(1, n - 1))}
                    className="w-10 h-10 rounded-md border border-warmstone-200 bg-warmstone-white text-warmstone-800 font-bold text-lg hover:bg-warmstone-100 transition-colors flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold text-warmstone-900 w-8 text-center">{timesPerDay}</span>
                  <button
                    type="button"
                    onClick={() => setTimesPerDay((n) => Math.min(MAX_TIMES, n + 1))}
                    className="w-10 h-10 rounded-md border border-warmstone-200 bg-warmstone-white text-warmstone-800 font-bold text-lg hover:bg-warmstone-100 transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-sm text-warmstone-600">times daily</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}
