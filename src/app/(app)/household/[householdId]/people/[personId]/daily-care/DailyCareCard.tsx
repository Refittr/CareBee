"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { DailyCareRecord, DailyCareShift, DailyCareMood } from "@/lib/types/database";

interface Props {
  record: DailyCareRecord;
  householdId: string;
  personId: string;
  onEdit: () => void;
  onDeleted: () => void;
}

const SHIFT_LABELS: Record<DailyCareShift, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  full_day: "Full day",
};

const SHIFT_COLOURS: Record<DailyCareShift, string> = {
  morning: "bg-honey-100 text-honey-800",
  afternoon: "bg-sage-100 text-sage-800",
  evening: "bg-warmstone-100 text-warmstone-700",
  night: "bg-warmstone-200 text-warmstone-800",
  full_day: "bg-honey-100 text-honey-800",
};

const MOOD_LABELS: Record<DailyCareMood, string> = {
  happy: "Happy",
  calm: "Calm",
  anxious: "Anxious",
  confused: "Confused",
  low: "Low",
  agitated: "Agitated",
  tired: "Tired",
  other: "Other",
};

const MOOD_COLOURS: Record<DailyCareMood, string> = {
  happy: "bg-sage-100 text-sage-800",
  calm: "bg-sage-100 text-sage-800",
  anxious: "bg-honey-100 text-honey-800",
  confused: "bg-honey-100 text-honey-800",
  low: "bg-warmstone-100 text-warmstone-700",
  agitated: "bg-honey-100 text-honey-800",
  tired: "bg-warmstone-100 text-warmstone-700",
  other: "bg-warmstone-100 text-warmstone-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function label(val: string | null, map: Record<string, string>) {
  if (!val) return null;
  return map[val] ?? val;
}

const COMPLETION_LABELS: Record<string, string> = {
  completed: "Completed",
  partial: "Partial",
  declined: "Declined",
  not_applicable: "N/A",
};

const PORTION_LABELS: Record<string, string> = {
  all: "All",
  most: "Most",
  some: "Some",
  none: "None",
  not_applicable: "N/A",
};

const HYDRATION_LABELS: Record<string, string> = {
  good: "Good",
  adequate: "Adequate",
  poor: "Poor",
  not_recorded: "Not recorded",
};

const MEDICATION_LABELS: Record<string, string> = {
  yes: "Given",
  no: "Not given",
  partial: "Partial",
  not_applicable: "N/A",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide mb-1">{title}</p>
      <div className="text-sm text-warmstone-800">{children}</div>
    </div>
  );
}

function ValueRow({ name, value }: { name: string; value: string | null }) {
  if (!value) return null;
  return (
    <p><span className="text-warmstone-500">{name}:</span> {value}</p>
  );
}

export function DailyCareCard({ record, householdId, personId, onEdit, onDeleted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(
      `/api/households/${householdId}/people/${personId}/daily-care/${record.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      onDeleted();
    }
    setDeleting(false);
    setConfirmDelete(false);
  }

  // Summary line for collapsed view
  const mealsSummary = [
    record.breakfast && record.breakfast !== "not_applicable" ? `B: ${PORTION_LABELS[record.breakfast]}` : null,
    record.lunch && record.lunch !== "not_applicable" ? `L: ${PORTION_LABELS[record.lunch]}` : null,
    record.dinner && record.dinner !== "not_applicable" ? `D: ${PORTION_LABELS[record.dinner]}` : null,
  ].filter(Boolean).join(" · ");

  const medSummary = record.medication_given ? MEDICATION_LABELS[record.medication_given] : null;

  return (
    <div className="bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden">
      {/* Card header - always visible */}
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-warmstone-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Date */}
        <div className="shrink-0 text-center min-w-[48px]">
          <p className="text-2xl font-bold text-warmstone-900 leading-none">
            {new Date(record.record_date).getDate()}
          </p>
          <p className="text-xs text-warmstone-500 mt-0.5">
            {new Date(record.record_date).toLocaleDateString("en-GB", { month: "short" })}
          </p>
          <p className="text-xs text-warmstone-400">
            {new Date(record.record_date).getFullYear()}
          </p>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${SHIFT_COLOURS[record.shift]}`}>
              {SHIFT_LABELS[record.shift]}
            </span>
            {record.mood && (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${MOOD_COLOURS[record.mood]}`}>
                {MOOD_LABELS[record.mood]}
              </span>
            )}
            {record.follow_up_needed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <AlertTriangle size={10} /> Follow-up needed
              </span>
            )}
          </div>
          <p className="text-xs text-warmstone-400">
            {record.recorded_by_name ? `By ${record.recorded_by_name}` : ""}
            {record.recorded_by_name ? " · " : ""}
            {formatDate(record.record_date)}
            {" · "}{formatTime(record.created_at)}
          </p>
          {!expanded && (mealsSummary || medSummary) && (
            <p className="text-xs text-warmstone-500 mt-1">
              {[mealsSummary, medSummary ? `Meds: ${medSummary}` : null].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 text-warmstone-400 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-warmstone-100 px-4 py-4 flex flex-col gap-4">

          {(record.mood || record.mood_notes) && (
            <Section title="Mood & wellbeing">
              {record.mood && <p>{MOOD_LABELS[record.mood]}</p>}
              {record.mood_notes && <p className="text-warmstone-600 mt-0.5">{record.mood_notes}</p>}
            </Section>
          )}

          {(record.personal_care || record.personal_care_notes) && (
            <Section title="Personal care">
              {record.personal_care && <p>{label(record.personal_care, COMPLETION_LABELS)}</p>}
              {record.personal_care_notes && <p className="text-warmstone-600 mt-0.5">{record.personal_care_notes}</p>}
            </Section>
          )}

          {(record.breakfast || record.lunch || record.dinner || record.hydration || record.meals_notes) && (
            <Section title="Meals & hydration">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <ValueRow name="Breakfast" value={record.breakfast ? (PORTION_LABELS[record.breakfast] ?? null) : null} />
                <ValueRow name="Lunch" value={record.lunch ? (PORTION_LABELS[record.lunch] ?? null) : null} />
                <ValueRow name="Dinner" value={record.dinner ? (PORTION_LABELS[record.dinner] ?? null) : null} />
                <ValueRow name="Hydration" value={record.hydration ? (HYDRATION_LABELS[record.hydration] ?? null) : null} />
              </div>
              {record.meals_notes && <p className="text-warmstone-600 mt-1">{record.meals_notes}</p>}
            </Section>
          )}

          {record.mobility_notes && (
            <Section title="Mobility">
              <p className="text-warmstone-600">{record.mobility_notes}</p>
            </Section>
          )}

          {(record.medication_given || record.medication_notes) && (
            <Section title="Medication">
              {record.medication_given && <p>{MEDICATION_LABELS[record.medication_given]}</p>}
              {record.medication_notes && <p className="text-warmstone-600 mt-0.5">{record.medication_notes}</p>}
            </Section>
          )}

          {record.sleep_notes && (
            <Section title="Sleep">
              <p className="text-warmstone-600">{record.sleep_notes}</p>
            </Section>
          )}

          {record.observations && (
            <Section title="Observations">
              <p className="text-warmstone-600">{record.observations}</p>
            </Section>
          )}

          {(record.concerns || record.follow_up_needed) && (
            <Section title="Concerns & handover">
              {record.follow_up_needed && (
                <p className="flex items-center gap-1 text-red-700 font-medium mb-1">
                  <AlertTriangle size={14} /> Follow-up needed
                </p>
              )}
              {record.concerns && <p className="text-warmstone-600">{record.concerns}</p>}
            </Section>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-warmstone-100">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1.5 text-sm text-warmstone-600 hover:text-warmstone-900 transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-warmstone-500">Delete this record?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-warmstone-500 hover:text-warmstone-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className="flex items-center gap-1.5 text-sm text-warmstone-400 hover:text-red-600 transition-colors ml-auto"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
