"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";
import type {
  DailyCareRecord,
  DailyCareShift,
  DailyCareMood,
  DailyCareCompletion,
  DailyCarePortion,
  DailyCareHydration,
  DailyCareMedication,
} from "@/lib/types/database";

interface Props {
  householdId: string;
  personId: string;
  personName: string;
  record?: DailyCareRecord;
  openFlags?: DailyCareRecord[];
  onFlagDismissed?: (id: string) => void;
  onSaved: (record: DailyCareRecord, isEdit: boolean) => void;
  onCancel: () => void;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={[
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            value === opt.value
              ? "bg-honey-400 text-warmstone-white border-honey-400"
              : "bg-warmstone-white text-warmstone-700 border-warmstone-200 hover:border-warmstone-400",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-warmstone-800 border-b border-warmstone-100 pb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function TextArea({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-800 placeholder-warmstone-300 resize-none focus:outline-none focus:ring-2 focus:ring-honey-300"
    />
  );
}

const SHIFT_OPTIONS: { value: DailyCareShift; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
  { value: "full_day", label: "Full day" },
];

const MOOD_OPTIONS: { value: DailyCareMood; label: string }[] = [
  { value: "happy", label: "Happy" },
  { value: "calm", label: "Calm" },
  { value: "anxious", label: "Anxious" },
  { value: "confused", label: "Confused" },
  { value: "low", label: "Low" },
  { value: "agitated", label: "Agitated" },
  { value: "tired", label: "Tired" },
  { value: "other", label: "Other" },
];

const COMPLETION_OPTIONS: { value: DailyCareCompletion; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "partial", label: "Partial" },
  { value: "declined", label: "Declined" },
  { value: "not_applicable", label: "Not applicable" },
];

const PORTION_OPTIONS: { value: DailyCarePortion; label: string }[] = [
  { value: "all", label: "All" },
  { value: "most", label: "Most" },
  { value: "some", label: "Some" },
  { value: "none", label: "None" },
  { value: "not_applicable", label: "N/A" },
];

const HYDRATION_OPTIONS: { value: DailyCareHydration; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "adequate", label: "Adequate" },
  { value: "poor", label: "Poor" },
  { value: "not_recorded", label: "Not recorded" },
];

const MEDICATION_OPTIONS: { value: DailyCareMedication; label: string }[] = [
  { value: "yes", label: "Given" },
  { value: "no", label: "Not given" },
  { value: "partial", label: "Partial" },
  { value: "not_applicable", label: "Not applicable" },
];

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night", full_day: "Full day",
};

function formatFlagDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function DailyCareForm({ householdId, personId, personName, record, openFlags = [], onFlagDismissed, onSaved, onCancel }: Props) {
  const isEdit = !!record;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  async function dismissFlag(flagId: string) {
    setDismissingId(flagId);
    await fetch(
      `/api/households/${householdId}/people/${personId}/daily-care/${flagId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follow_up_resolved: true }),
      }
    );
    setDismissingId(null);
    onFlagDismissed?.(flagId);
  }

  const [recordDate, setRecordDate] = useState(record?.record_date ?? today());
  const [shift, setShift] = useState<DailyCareShift | null>(record?.shift ?? null);
  const [mood, setMood] = useState<DailyCareMood | null>(record?.mood ?? null);
  const [moodNotes, setMoodNotes] = useState(record?.mood_notes ?? "");
  const [personalCare, setPersonalCare] = useState<DailyCareCompletion | null>(record?.personal_care ?? null);
  const [personalCareNotes, setPersonalCareNotes] = useState(record?.personal_care_notes ?? "");
  const [breakfast, setBreakfast] = useState<DailyCarePortion | null>(record?.breakfast ?? null);
  const [lunch, setLunch] = useState<DailyCarePortion | null>(record?.lunch ?? null);
  const [dinner, setDinner] = useState<DailyCarePortion | null>(record?.dinner ?? null);
  const [hydration, setHydration] = useState<DailyCareHydration | null>(record?.hydration ?? null);
  const [mealsNotes, setMealsNotes] = useState(record?.meals_notes ?? "");
  const [mobilityNotes, setMobilityNotes] = useState(record?.mobility_notes ?? "");
  const [medicationGiven, setMedicationGiven] = useState<DailyCareMedication | null>(record?.medication_given ?? null);
  const [medicationNotes, setMedicationNotes] = useState(record?.medication_notes ?? "");
  const [sleepNotes, setSleepNotes] = useState(record?.sleep_notes ?? "");
  const [observations, setObservations] = useState(record?.observations ?? "");
  const [concerns, setConcerns] = useState(record?.concerns ?? "");
  const [followUpNeeded, setFollowUpNeeded] = useState(record?.follow_up_needed ?? false);

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shift) { setError("Please select a shift."); return; }
    setError(null);
    setSaving(true);

    const payload = {
      record_date: recordDate,
      shift,
      mood: mood ?? null,
      mood_notes: moodNotes || null,
      personal_care: personalCare ?? null,
      personal_care_notes: personalCareNotes || null,
      breakfast: breakfast ?? null,
      lunch: lunch ?? null,
      dinner: dinner ?? null,
      hydration: hydration ?? null,
      meals_notes: mealsNotes || null,
      mobility_notes: mobilityNotes || null,
      medication_given: medicationGiven ?? null,
      medication_notes: medicationNotes || null,
      sleep_notes: sleepNotes || null,
      observations: observations || null,
      concerns: concerns || null,
      follow_up_needed: followUpNeeded,
    };

    const url = isEdit
      ? `/api/households/${householdId}/people/${personId}/daily-care/${record!.id}`
      : `/api/households/${householdId}/people/${personId}/daily-care`;

    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    onSaved(data as DailyCareRecord, isEdit);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-lg h-full bg-warmstone-50 shadow-xl flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warmstone-200 bg-warmstone-white">
          <h2 className="text-base font-bold text-warmstone-900">
            {isEdit ? "Edit record" : "Add daily care record"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-md text-warmstone-400 hover:text-warmstone-800 hover:bg-warmstone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 flex flex-col gap-6">

            {/* Open follow-up flags from previous records */}
            {!isEdit && openFlags.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-200 bg-red-100">
                  <AlertTriangle size={14} className="text-red-600 shrink-0" />
                  <p className="text-sm font-semibold text-red-800">
                    {openFlags.length} open follow-up{openFlags.length !== 1 ? "s" : ""} from previous records
                  </p>
                </div>
                <div className="divide-y divide-red-100">
                  {openFlags.map((flag) => (
                    <div key={flag.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-red-700 mb-0.5">
                          {SHIFT_LABELS[flag.shift] ?? flag.shift} · {formatFlagDate(flag.record_date)}
                        </p>
                        {flag.concerns && (
                          <p className="text-sm text-warmstone-800 leading-snug">{flag.concerns}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => dismissFlag(flag.id)}
                        disabled={dismissingId === flag.id}
                        className="shrink-0 flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={13} />
                        {dismissingId === flag.id ? "Resolving..." : "Resolve"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 1 — When */}
            <FieldSection title="When">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-warmstone-600">Date</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  required
                  className="px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-800 focus:outline-none focus:ring-2 focus:ring-honey-300 w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-warmstone-600">Shift <span className="text-red-500">*</span></label>
                <PillGroup options={SHIFT_OPTIONS} value={shift} onChange={(v) => setShift(v)} />
              </div>
            </FieldSection>

            {/* Section 2 — Mood */}
            <FieldSection title="Mood & wellbeing">
              <PillGroup options={MOOD_OPTIONS} value={mood} onChange={(v) => setMood(v)} />
              <TextArea
                placeholder="Describe how they seemed, including any changes in behaviour, energy, or anything they mentioned"
                value={moodNotes}
                onChange={setMoodNotes}
              />
            </FieldSection>

            {/* Section 3 — Personal care */}
            <FieldSection title="Personal care">
              <PillGroup options={COMPLETION_OPTIONS} value={personalCare} onChange={(v) => setPersonalCare(v)} />
              <TextArea
                placeholder="What was done and how much support was needed"
                value={personalCareNotes}
                onChange={setPersonalCareNotes}
              />
            </FieldSection>

            {/* Section 4 — Meals */}
            <FieldSection title="Meals & hydration">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-warmstone-600">Breakfast</label>
                <PillGroup options={PORTION_OPTIONS} value={breakfast} onChange={(v) => setBreakfast(v)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-warmstone-600">Lunch</label>
                <PillGroup options={PORTION_OPTIONS} value={lunch} onChange={(v) => setLunch(v)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-warmstone-600">Dinner</label>
                <PillGroup options={PORTION_OPTIONS} value={dinner} onChange={(v) => setDinner(v)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-warmstone-600">Hydration</label>
                <PillGroup options={HYDRATION_OPTIONS} value={hydration} onChange={(v) => setHydration(v)} />
              </div>
              <TextArea
                placeholder="Any preferences, refusals, or appetite concerns"
                value={mealsNotes}
                onChange={setMealsNotes}
              />
            </FieldSection>

            {/* Section 5 — Mobility */}
            <FieldSection title="Mobility">
              <TextArea
                placeholder="How did they move around today? Any assistance needed, use of aids, or concerns about balance or falls?"
                value={mobilityNotes}
                onChange={setMobilityNotes}
              />
            </FieldSection>

            {/* Section 6 — Medication */}
            <FieldSection title="Medication">
              <PillGroup options={MEDICATION_OPTIONS} value={medicationGiven} onChange={(v) => setMedicationGiven(v)} />
              <TextArea
                placeholder="Include any reactions, refusals, or timing issues"
                value={medicationNotes}
                onChange={setMedicationNotes}
              />
            </FieldSection>

            {/* Section 7 — Sleep */}
            <FieldSection title="Sleep">
              <TextArea
                placeholder="How did they sleep? Any disturbances? (Most relevant for overnight or full-day records)"
                value={sleepNotes}
                onChange={setSleepNotes}
              />
            </FieldSection>

            {/* Section 8 — Observations */}
            <FieldSection title="Observations">
              <TextArea
                placeholder="Anything else worth noting: visitors, activities, conversations, changes in appearance or routine"
                value={observations}
                onChange={setObservations}
              />
            </FieldSection>

            {/* Section 9 — Handover */}
            <FieldSection title="Handover">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-warmstone-800">Follow-up needed</p>
                  <p className="text-xs text-warmstone-500 mt-0.5">Flag this for the next carer or family member</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={followUpNeeded}
                  onClick={() => setFollowUpNeeded((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    followUpNeeded ? "bg-honey-400" : "bg-warmstone-200"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      followUpNeeded ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <TextArea
                placeholder="What does the next carer or family member need to know?"
                value={concerns}
                onChange={setConcerns}
              />
            </FieldSection>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-warmstone-white border-t border-warmstone-200 px-5 py-4">
            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}
            <p className="text-xs text-warmstone-400 mb-3">
              This record will be saved under your account for {personName}.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : isEdit ? "Save changes" : "Save record"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-warmstone-500 hover:text-warmstone-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
