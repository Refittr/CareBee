"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { TestResult } from "@/lib/types/database";

const PRESET_TESTS = [
  "Blood Pressure",
  "HbA1c",
  "Full Blood Count",
  "eGFR",
  "Cholesterol (Total)",
  "HDL Cholesterol",
  "LDL Cholesterol",
  "Triglycerides",
  "TSH",
  "Liver Function (ALT)",
  "Kidney Function (Creatinine)",
  "INR",
  "PSA",
  "Vitamin D",
  "Iron / Ferritin",
  "Blood Glucose",
  "CRP",
  "ESR",
  "Other",
];

interface TestResultFormProps {
  initial?: Partial<TestResult>;
  onSave: (data: Omit<TestResult, "id" | "person_id" | "household_id" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
  loading?: boolean;
}

type AbnormalOption = "unknown" | "normal" | "abnormal";

function abnormalFromBool(value: boolean | null | undefined): AbnormalOption {
  if (value === true) return "abnormal";
  if (value === false) return "normal";
  return "unknown";
}

function abnormalToBool(value: AbnormalOption): boolean | null {
  if (value === "abnormal") return true;
  if (value === "normal") return false;
  return null;
}

export function TestResultForm({ initial, onSave, onCancel, loading }: TestResultFormProps) {
  // Determine if the initial test_name is a preset or custom
  const initialIsPreset =
    !initial?.test_name || PRESET_TESTS.includes(initial.test_name);
  const initialPreset = initialIsPreset ? (initial?.test_name ?? "") : "Other";
  const initialCustom = !initialIsPreset ? (initial?.test_name ?? "") : "";

  const [preset, setPreset] = useState(initialPreset);
  const [customName, setCustomName] = useState(initialCustom);
  const [resultValue, setResultValue] = useState(initial?.result_value ?? "");
  const [resultDate, setResultDate] = useState(initial?.result_date ?? "");
  const [normalRange, setNormalRange] = useState(initial?.normal_range ?? "");
  const [abnormal, setAbnormal] = useState<AbnormalOption>(
    abnormalFromBool(initial?.is_abnormal)
  );
  const [orderedBy, setOrderedBy] = useState(initial?.ordered_by ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setValueError(null);

    const testName = preset === "Other" ? customName.trim() : preset;
    if (!testName) {
      setNameError("Please enter a test name.");
      return;
    }
    if (!resultValue.trim()) {
      setValueError("Please enter the result value.");
      return;
    }

    onSave({
      test_name: testName,
      result_value: resultValue.trim(),
      result_date: resultDate || null,
      normal_range: normalRange.trim() || null,
      is_abnormal: abnormalToBool(abnormal),
      ordered_by: orderedBy.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Test name */}
      <div className="flex flex-col gap-1.5">
        <Select
          label="Test name"
          value={preset}
          onChange={(e) => { setPreset(e.target.value); setNameError(null); }}
          error={preset !== "Other" ? nameError ?? undefined : undefined}
        >
          <option value="">Select a test...</option>
          {PRESET_TESTS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        {preset === "Other" && (
          <Input
            label="Test name (custom)"
            value={customName}
            onChange={(e) => { setCustomName(e.target.value); setNameError(null); }}
            placeholder="e.g. Ferritin, Uric Acid"
            error={nameError ?? undefined}
          />
        )}
      </div>

      {/* Result value */}
      <Input
        label="Result value"
        value={resultValue}
        onChange={(e) => { setResultValue(e.target.value); setValueError(null); }}
        placeholder="e.g. 48 mmol/mol, 142/88 mmHg, 6.2 mmol/L"
        required
        error={valueError ?? undefined}
      />

      {/* Result date */}
      <Input
        label="Result date"
        type="date"
        value={resultDate}
        onChange={(e) => setResultDate(e.target.value)}
      />

      {/* Normal range */}
      <Input
        label="Normal range"
        value={normalRange}
        onChange={(e) => setNormalRange(e.target.value)}
        placeholder="e.g. below 42 mmol/mol, 90/60 to 120/80 mmHg"
      />

      {/* Outside normal range */}
      <Select
        label="Outside normal range"
        value={abnormal}
        onChange={(e) => setAbnormal(e.target.value as AbnormalOption)}
      >
        <option value="unknown">Not known</option>
        <option value="normal">No, within normal range</option>
        <option value="abnormal">Yes, outside normal range</option>
      </Select>

      {/* Ordered by */}
      <Input
        label="Ordered by"
        value={orderedBy}
        onChange={(e) => setOrderedBy(e.target.value)}
        placeholder="e.g. Dr Patel, GP"
      />

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-warmstone-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context or plain English interpretation of the result"
          rows={3}
          className="border border-warmstone-200 rounded-md px-3 py-2.5 text-sm text-warmstone-900 bg-warmstone-white placeholder:text-warmstone-400 focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} fullWidth>
          {initial?.id ? "Save changes" : "Add result"}
        </Button>
      </div>
    </form>
  );
}
