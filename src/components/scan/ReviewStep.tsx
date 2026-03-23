"use client";

import { useEffect, useState } from "react";
import {
  Pill,
  HeartPulse,
  ShieldAlert,
  Calendar,
  FlaskConical,
  ListChecks,
  Users,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ReviewCard } from "./ReviewCard";
import type {
  ScanResult,
  ScanConfidence,
  ScannedMedication,
  ScannedCondition,
  ScannedAllergy,
  ScannedAppointment,
  ScannedTestResult,
} from "@/lib/types/scan";
import type { DocumentType } from "@/lib/types/database";

// ---- types ----

interface ReviewItem<T> {
  data: T;
  checked: boolean;
  editing: boolean;
  isDuplicate: boolean;
}

// ---- helpers ----

function initItems<T extends { confidence: ScanConfidence }>(
  items: T[] | undefined
): ReviewItem<T>[] {
  return (items ?? []).map((item) => ({
    data: item,
    checked: item.confidence !== "low",
    editing: false,
    isDuplicate: false,
  }));
}

function toggle<T>(
  items: ReviewItem<T>[],
  index: number
): ReviewItem<T>[] {
  return items.map((it, i) =>
    i === index ? { ...it, checked: !it.checked } : it
  );
}

function setEditing<T>(
  items: ReviewItem<T>[],
  index: number,
  value: boolean
): ReviewItem<T>[] {
  return items.map((it, i) =>
    i === index ? { ...it, editing: value } : it
  );
}

function patchData<T>(
  items: ReviewItem<T>[],
  index: number,
  patch: Partial<T>
): ReviewItem<T>[] {
  return items.map((it, i) =>
    i === index ? { ...it, data: { ...it.data, ...patch } } : it
  );
}

const DOC_TYPE_MAP: Record<string, DocumentType> = {
  discharge_summary: "discharge_summary",
  prescription: "prescription",
  appointment_letter: "appointment_letter",
  test_result: "test_result",
  benefit_letter: "benefit_letter",
  referral_letter: "other",
  other: "other",
};

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-warmstone-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-warmstone-200 rounded-md px-3 py-2 text-sm text-warmstone-900 bg-warmstone-white focus:outline-none focus:ring-2 focus:ring-honey-200 focus:border-honey-400"
      />
    </div>
  );
}

// ---- Collapsible section ----

function Section({
  icon,
  iconClass,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 py-1 group"
      >
        <span className={iconClass}>{icon}</span>
        <span className="font-bold text-warmstone-900 flex-1 text-left">{title}</span>
        <span className="text-xs text-warmstone-400 mr-1">{count}</span>
        {open ? (
          <ChevronUp size={16} className="text-warmstone-400" />
        ) : (
          <ChevronDown size={16} className="text-warmstone-400" />
        )}
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}

// ---- Main component ----

interface ReviewStepProps {
  scanResult: ScanResult;
  filePath: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string;
  householdId: string;
  personId: string;
  onSaved: (count: number) => void;
  onDiscard: () => void;
}

export function ReviewStep({
  scanResult,
  filePath,
  fileName,
  fileSize,
  mimeType,
  householdId,
  personId,
  onSaved,
  onDiscard,
}: ReviewStepProps) {
  const supabase = createClient();

  const [medications, setMedications] = useState<ReviewItem<ScannedMedication>[]>(
    () => initItems(scanResult.medications)
  );
  const [conditions, setConditions] = useState<ReviewItem<ScannedCondition>[]>(
    () => initItems(scanResult.conditions)
  );
  const [allergies, setAllergies] = useState<ReviewItem<ScannedAllergy>[]>(
    () => initItems(scanResult.allergies)
  );
  const [appointments, setAppointments] = useState<ReviewItem<ScannedAppointment>[]>(
    () => initItems(scanResult.appointments)
  );
  const [testResults, setTestResults] = useState<ReviewItem<ScannedTestResult>[]>(
    () => initItems(scanResult.test_results)
  );

  const [saving, setSaving] = useState(false);

  // Duplicate detection
  useEffect(() => {
    async function checkDuplicates() {
      const [{ data: existingMeds }, { data: existingConds }, { data: existingAllergies }, { data: existingTests }] =
        await Promise.all([
          supabase
            .from("medications")
            .select("name")
            .eq("person_id", personId)
            .eq("is_active", true),
          supabase
            .from("conditions")
            .select("name")
            .eq("person_id", personId)
            .eq("is_active", true),
          supabase.from("allergies").select("name").eq("person_id", personId),
          supabase.from("test_results").select("test_name, result_date").eq("person_id", personId),
        ]);

      const medNames = new Set(
        (existingMeds ?? []).map((m) => m.name.toLowerCase())
      );
      const condNames = new Set(
        (existingConds ?? []).map((c) => c.name.toLowerCase())
      );
      const allergyNames = new Set(
        (existingAllergies ?? []).map((a) => a.name.toLowerCase())
      );
      // Key: "test_name|date"
      const testKeys = new Set(
        (existingTests ?? []).map((t) => `${t.test_name.toLowerCase()}|${t.result_date ?? ""}`)
      );

      setMedications((prev) =>
        prev.map((it) => ({
          ...it,
          isDuplicate: medNames.has(it.data.name.toLowerCase()),
        }))
      );
      setConditions((prev) =>
        prev.map((it) => ({
          ...it,
          isDuplicate: condNames.has(it.data.name.toLowerCase()),
        }))
      );
      setAllergies((prev) =>
        prev.map((it) => ({
          ...it,
          isDuplicate: allergyNames.has(it.data.name.toLowerCase()),
        }))
      );
      setTestResults((prev) =>
        prev.map((it) => ({
          ...it,
          isDuplicate: testKeys.has(
            `${it.data.test_name.toLowerCase()}|${it.data.result_date ?? ""}`
          ),
        }))
      );
    }
    checkDuplicates();
  }, [personId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCount =
    medications.filter((m) => m.checked).length +
    conditions.filter((c) => c.checked).length +
    allergies.filter((a) => a.checked).length +
    appointments.filter((a) => a.checked).length +
    testResults.filter((t) => t.checked).length;

  async function handleSave() {
    setSaving(true);
    let savedCount = 0;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Save checked medications
    for (const item of medications.filter((m) => m.checked)) {
      const med = item.data;
      const { data: insertedMed } = await supabase
        .from("medications")
        .insert({
          person_id: personId,
          household_id: householdId,
          name: med.name,
          dosage: med.dosage ?? null,
          frequency: med.frequency ?? null,
          purpose: med.purpose ?? null,
          prescribed_by: med.prescribed_by ?? null,
          start_date: med.start_date ?? null,
          is_active: med.action !== "stopped",
        })
        .select("id")
        .single();
      savedCount++;

      if (med.action === "changed" && insertedMed?.id) {
        await supabase.from("medication_changes").insert({
          medication_id: insertedMed.id,
          person_id: personId,
          household_id: householdId,
          change_date: new Date().toISOString().slice(0, 10),
          change_description: med.change_reason ?? "Medication changed",
          changed_by_professional: med.prescribed_by ?? null,
          reason: med.change_reason ?? null,
        });
      }
    }

    // Save checked conditions
    for (const item of conditions.filter((c) => c.checked)) {
      const cond = item.data;
      await supabase.from("conditions").insert({
        person_id: personId,
        household_id: householdId,
        name: cond.name,
        date_diagnosed: cond.date_diagnosed ?? null,
        diagnosed_by: cond.diagnosed_by ?? null,
        diagnosed_at_location: cond.diagnosed_at_location ?? null,
        current_status: cond.status ?? null,
        is_active: true,
      });
      savedCount++;
    }

    // Save checked allergies
    for (const item of allergies.filter((a) => a.checked)) {
      const allergy = item.data;
      await supabase.from("allergies").insert({
        person_id: personId,
        household_id: householdId,
        name: allergy.name,
        reaction: allergy.reaction ?? null,
      });
      savedCount++;
    }

    // Save checked appointments
    for (const item of appointments.filter((a) => a.checked)) {
      const appt = item.data;
      const today = new Date().toISOString().slice(0, 10);
      const appointmentDate = appt.date
        ? appt.time
          ? `${appt.date}T${appt.time}:00`
          : appt.date
        : today;
      const isPast =
        appt.type === "past" || (appt.date ? appt.date < today : false);

      await supabase.from("appointments").insert({
        person_id: personId,
        household_id: householdId,
        title: appt.title,
        appointment_date: appointmentDate,
        location: appt.location ?? null,
        professional_name: appt.professional_name ?? null,
        department: appt.department ?? null,
        trust_or_service: appt.trust_or_service ?? null,
        status: isPast ? "completed" : "upcoming",
      });
      savedCount++;
    }

    // Save checked test results
    for (const item of testResults.filter((t) => t.checked)) {
      const tr = item.data;
      await supabase.from("test_results").insert({
        person_id: personId,
        household_id: householdId,
        test_name: tr.test_name,
        result_value: tr.result_value ?? null,
        result_date: tr.result_date ?? null,
        normal_range: tr.normal_range ?? null,
        is_abnormal: tr.is_abnormal ?? null,
        ordered_by: tr.ordered_by ?? null,
        notes: tr.notes ?? null,
      });
      savedCount++;
    }

    // Always save the document
    await supabase.from("documents").insert({
      person_id: personId,
      household_id: householdId,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize ?? null,
      mime_type: mimeType,
      document_type: DOC_TYPE_MAP[scanResult.document_type] ?? "other",
      document_date: scanResult.document_date ?? null,
      description: scanResult.summary ?? null,
      uploaded_by: user?.id ?? null,
    });

    setSaving(false);
    onSaved(savedCount);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-3 border-b border-warmstone-100">
        <h2 className="text-xl font-bold text-warmstone-900">Here is what we found</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6 max-w-2xl mx-auto w-full">
        {/* Summary */}
        {scanResult.summary && (
          <div className="flex items-start gap-3 bg-info-light border border-info/20 rounded-xl px-4 py-3">
            <Lightbulb size={16} className="text-info shrink-0 mt-0.5" />
            <p className="text-sm text-warmstone-800 leading-relaxed">
              {scanResult.summary}
            </p>
          </div>
        )}

        {/* Medications */}
        <Section
          icon={<Pill size={16} />}
          iconClass="text-sage-400"
          title="Medications"
          count={medications.length}
        >
          {medications.map((item, i) => (
            <ReviewCard
              key={i}
              checked={item.checked}
              onToggle={() => setMedications(toggle(medications, i))}
              confidence={item.data.confidence}
              editing={item.editing}
              onEditToggle={() =>
                setMedications(setEditing(medications, i, !item.editing))
              }
              isDuplicate={item.isDuplicate}
              duplicateMessage="This medication is already in the record. Saving it will create a duplicate."
              editContent={
                <div className="grid grid-cols-1 gap-3">
                  <EditField
                    label="Name"
                    value={item.data.name}
                    onChange={(v) =>
                      setMedications(patchData(medications, i, { name: v }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <EditField
                      label="Dosage"
                      value={item.data.dosage ?? ""}
                      onChange={(v) =>
                        setMedications(
                          patchData(medications, i, { dosage: v || null })
                        )
                      }
                    />
                    <EditField
                      label="Frequency"
                      value={item.data.frequency ?? ""}
                      onChange={(v) =>
                        setMedications(
                          patchData(medications, i, { frequency: v || null })
                        )
                      }
                    />
                  </div>
                  <EditField
                    label="Purpose"
                    value={item.data.purpose ?? ""}
                    onChange={(v) =>
                      setMedications(
                        patchData(medications, i, { purpose: v || null })
                      )
                    }
                  />
                  <EditField
                    label="Prescribed by"
                    value={item.data.prescribed_by ?? ""}
                    onChange={(v) =>
                      setMedications(
                        patchData(medications, i, { prescribed_by: v || null })
                      )
                    }
                  />
                </div>
              }
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-warmstone-900">{item.data.name}</p>
                  <Badge
                    variant={
                      item.data.action === "new"
                        ? "active"
                        : item.data.action === "changed"
                        ? "warning"
                        : "error"
                    }
                  >
                    {item.data.action === "new"
                      ? "New"
                      : item.data.action === "changed"
                      ? "Changed"
                      : "Stopped"}
                  </Badge>
                </div>
                {(item.data.dosage || item.data.frequency) && (
                  <p className="text-sm text-warmstone-600">
                    {[item.data.dosage, item.data.frequency]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {item.data.purpose && (
                  <p className="text-xs text-warmstone-400">{item.data.purpose}</p>
                )}
                {item.data.prescribed_by && (
                  <p className="text-xs text-warmstone-400">
                    Prescribed by {item.data.prescribed_by}
                  </p>
                )}
              </div>
            </ReviewCard>
          ))}
        </Section>

        {/* Conditions */}
        <Section
          icon={<HeartPulse size={16} />}
          iconClass="text-sage-400"
          title="Conditions"
          count={conditions.length}
        >
          {conditions.map((item, i) => (
            <ReviewCard
              key={i}
              checked={item.checked}
              onToggle={() => setConditions(toggle(conditions, i))}
              confidence={item.data.confidence}
              editing={item.editing}
              onEditToggle={() =>
                setConditions(setEditing(conditions, i, !item.editing))
              }
              isDuplicate={item.isDuplicate}
              duplicateMessage="This condition is already in the record. Saving it will create a duplicate."
              editContent={
                <div className="grid grid-cols-1 gap-3">
                  <EditField
                    label="Name"
                    value={item.data.name}
                    onChange={(v) =>
                      setConditions(patchData(conditions, i, { name: v }))
                    }
                  />
                  <EditField
                    label="Date diagnosed (YYYY-MM-DD)"
                    value={item.data.date_diagnosed ?? ""}
                    onChange={(v) =>
                      setConditions(
                        patchData(conditions, i, { date_diagnosed: v || null })
                      )
                    }
                  />
                  <EditField
                    label="Diagnosed by"
                    value={item.data.diagnosed_by ?? ""}
                    onChange={(v) =>
                      setConditions(
                        patchData(conditions, i, { diagnosed_by: v || null })
                      )
                    }
                  />
                  <EditField
                    label="Location"
                    value={item.data.diagnosed_at_location ?? ""}
                    onChange={(v) =>
                      setConditions(
                        patchData(conditions, i, {
                          diagnosed_at_location: v || null,
                        })
                      )
                    }
                  />
                  <EditField
                    label="Status"
                    value={item.data.status ?? ""}
                    onChange={(v) =>
                      setConditions(
                        patchData(conditions, i, { status: v || null })
                      )
                    }
                  />
                </div>
              }
            >
              <div className="flex flex-col gap-1">
                <p className="font-bold text-warmstone-900">{item.data.name}</p>
                {item.data.date_diagnosed && (
                  <p className="text-sm text-warmstone-600">
                    Diagnosed: {item.data.date_diagnosed}
                  </p>
                )}
                {item.data.diagnosed_by && (
                  <p className="text-xs text-warmstone-400">
                    {item.data.diagnosed_by}
                    {item.data.diagnosed_at_location
                      ? `, ${item.data.diagnosed_at_location}`
                      : ""}
                  </p>
                )}
                {item.data.status && (
                  <p className="text-xs text-warmstone-400">{item.data.status}</p>
                )}
              </div>
            </ReviewCard>
          ))}
        </Section>

        {/* Allergies */}
        <Section
          icon={<ShieldAlert size={16} />}
          iconClass="text-error"
          title="Allergies"
          count={allergies.length}
        >
          {allergies.map((item, i) => (
            <ReviewCard
              key={i}
              checked={item.checked}
              onToggle={() => setAllergies(toggle(allergies, i))}
              confidence={item.data.confidence}
              editing={item.editing}
              onEditToggle={() =>
                setAllergies(setEditing(allergies, i, !item.editing))
              }
              isDuplicate={item.isDuplicate}
              duplicateMessage="This allergy is already in the record."
              className="bg-error-light border-error/30"
              editContent={
                <div className="grid grid-cols-1 gap-3">
                  <EditField
                    label="Allergen"
                    value={item.data.name}
                    onChange={(v) =>
                      setAllergies(patchData(allergies, i, { name: v }))
                    }
                  />
                  <EditField
                    label="Reaction"
                    value={item.data.reaction ?? ""}
                    onChange={(v) =>
                      setAllergies(
                        patchData(allergies, i, { reaction: v || null })
                      )
                    }
                  />
                </div>
              }
            >
              <div className="flex flex-col gap-1">
                <p className="font-bold text-warmstone-900">{item.data.name}</p>
                {item.data.reaction && (
                  <p className="text-sm text-warmstone-600">{item.data.reaction}</p>
                )}
              </div>
            </ReviewCard>
          ))}
        </Section>

        {/* Appointments */}
        <Section
          icon={<Calendar size={16} />}
          iconClass="text-sage-400"
          title="Appointments"
          count={appointments.length}
        >
          {appointments.map((item, i) => (
            <ReviewCard
              key={i}
              checked={item.checked}
              onToggle={() => setAppointments(toggle(appointments, i))}
              confidence={item.data.confidence}
              editing={item.editing}
              onEditToggle={() =>
                setAppointments(setEditing(appointments, i, !item.editing))
              }
              editContent={
                <div className="grid grid-cols-1 gap-3">
                  <EditField
                    label="Title"
                    value={item.data.title}
                    onChange={(v) =>
                      setAppointments(patchData(appointments, i, { title: v }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <EditField
                      label="Date (YYYY-MM-DD)"
                      value={item.data.date ?? ""}
                      onChange={(v) =>
                        setAppointments(
                          patchData(appointments, i, { date: v || null })
                        )
                      }
                    />
                    <EditField
                      label="Time (HH:MM)"
                      value={item.data.time ?? ""}
                      onChange={(v) =>
                        setAppointments(
                          patchData(appointments, i, { time: v || null })
                        )
                      }
                    />
                  </div>
                  <EditField
                    label="Location"
                    value={item.data.location ?? ""}
                    onChange={(v) =>
                      setAppointments(
                        patchData(appointments, i, { location: v || null })
                      )
                    }
                  />
                  <EditField
                    label="Clinician"
                    value={item.data.professional_name ?? ""}
                    onChange={(v) =>
                      setAppointments(
                        patchData(appointments, i, {
                          professional_name: v || null,
                        })
                      )
                    }
                  />
                  <EditField
                    label="Department"
                    value={item.data.department ?? ""}
                    onChange={(v) =>
                      setAppointments(
                        patchData(appointments, i, { department: v || null })
                      )
                    }
                  />
                </div>
              }
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-warmstone-900">{item.data.title}</p>
                  <Badge variant={item.data.type === "upcoming" ? "active" : "neutral"}>
                    {item.data.type === "upcoming" ? "Upcoming" : "Past"}
                  </Badge>
                </div>
                {(item.data.date || item.data.time) && (
                  <p className="text-sm text-warmstone-600">
                    {[item.data.date, item.data.time].filter(Boolean).join(" at ")}
                  </p>
                )}
                {item.data.location && (
                  <p className="text-xs text-warmstone-400">{item.data.location}</p>
                )}
                {item.data.professional_name && (
                  <p className="text-xs text-warmstone-400">
                    {item.data.professional_name}
                    {item.data.department ? `, ${item.data.department}` : ""}
                  </p>
                )}
              </div>
            </ReviewCard>
          ))}
        </Section>

        {/* Test Results */}
        <Section
          icon={<FlaskConical size={16} />}
          iconClass="text-sage-400"
          title="Test Results"
          count={testResults.length}
        >
          {testResults.map((item, i) => (
            <ReviewCard
              key={i}
              checked={item.checked}
              onToggle={() => setTestResults(toggle(testResults, i))}
              confidence={item.data.confidence}
              editing={item.editing}
              onEditToggle={() =>
                setTestResults(setEditing(testResults, i, !item.editing))
              }
              isDuplicate={item.isDuplicate}
              duplicateMessage="A result with the same test name and date is already in the record."
              editContent={
                <div className="grid grid-cols-1 gap-3">
                  <EditField
                    label="Test name"
                    value={item.data.test_name}
                    onChange={(v) =>
                      setTestResults(patchData(testResults, i, { test_name: v }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <EditField
                      label="Result value"
                      value={item.data.result_value ?? ""}
                      onChange={(v) =>
                        setTestResults(
                          patchData(testResults, i, { result_value: v || null })
                        )
                      }
                    />
                    <EditField
                      label="Date (YYYY-MM-DD)"
                      value={item.data.result_date ?? ""}
                      onChange={(v) =>
                        setTestResults(
                          patchData(testResults, i, { result_date: v || null })
                        )
                      }
                    />
                  </div>
                  <EditField
                    label="Normal range"
                    value={item.data.normal_range ?? ""}
                    onChange={(v) =>
                      setTestResults(
                        patchData(testResults, i, { normal_range: v || null })
                      )
                    }
                  />
                  <EditField
                    label="Ordered by"
                    value={item.data.ordered_by ?? ""}
                    onChange={(v) =>
                      setTestResults(
                        patchData(testResults, i, { ordered_by: v || null })
                      )
                    }
                  />
                  <EditField
                    label="Notes"
                    value={item.data.notes ?? ""}
                    onChange={(v) =>
                      setTestResults(
                        patchData(testResults, i, { notes: v || null })
                      )
                    }
                  />
                </div>
              }
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-warmstone-900">{item.data.test_name}</p>
                  {item.data.is_abnormal === true && (
                    <Badge variant="error">
                      <AlertTriangle size={11} className="mr-1" />
                      Outside normal range
                    </Badge>
                  )}
                  {item.data.is_abnormal === false && (
                    <span className="inline-flex items-center gap-1 bg-sage-50 text-sage-400 rounded-sm px-2.5 py-0.5 text-xs font-semibold">
                      Within normal range
                    </span>
                  )}
                </div>
                {item.data.result_value && (
                  <p
                    className={`text-2xl font-bold ${
                      item.data.is_abnormal === true
                        ? "text-error"
                        : item.data.is_abnormal === false
                        ? "text-sage-400"
                        : "text-warmstone-800"
                    }`}
                  >
                    {item.data.result_value}
                  </p>
                )}
                {item.data.result_date && (
                  <p className="text-sm text-warmstone-600">{item.data.result_date}</p>
                )}
                {item.data.normal_range && (
                  <p className="text-sm text-warmstone-600">
                    Normal range: {item.data.normal_range}
                  </p>
                )}
                {item.data.ordered_by && (
                  <p className="text-xs text-warmstone-400">
                    Ordered by {item.data.ordered_by}
                  </p>
                )}
                {item.data.notes && (
                  <p className="text-sm text-warmstone-600 mt-1">{item.data.notes}</p>
                )}
              </div>
            </ReviewCard>
          ))}
        </Section>

        {/* Follow-up actions (informational, no checkbox) */}
        {(scanResult.follow_up_actions ?? []).length > 0 && (
          <Section
            icon={<ListChecks size={16} />}
            iconClass="text-honey-400"
            title="Follow-up actions"
            count={scanResult.follow_up_actions!.length}
          >
            {scanResult.follow_up_actions!.map((action, i) => (
              <div
                key={i}
                className="bg-warmstone-white border border-warmstone-100 rounded-lg p-4"
              >
                <p className="text-sm text-warmstone-800">{action.description}</p>
                {action.date && (
                  <p className="text-xs text-warmstone-400 mt-1">{action.date}</p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Referrals (informational) */}
        {(scanResult.referrals ?? []).length > 0 && (
          <Section
            icon={<ArrowRight size={16} />}
            iconClass="text-sage-400"
            title="Referrals"
            count={scanResult.referrals!.length}
          >
            {scanResult.referrals!.map((ref, i) => (
              <div
                key={i}
                className="bg-warmstone-white border border-warmstone-100 rounded-lg p-4"
              >
                <p className="font-semibold text-warmstone-900 text-sm">
                  {ref.referred_to}
                </p>
                {ref.reason && (
                  <p className="text-xs text-warmstone-600 mt-0.5">{ref.reason}</p>
                )}
                {ref.referred_by && (
                  <p className="text-xs text-warmstone-400 mt-0.5">
                    Referred by {ref.referred_by}
                  </p>
                )}
                {ref.expected_wait && (
                  <p className="text-xs text-warmstone-400">
                    Expected wait: {ref.expected_wait}
                  </p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Professional contacts (informational) */}
        {(scanResult.professional_contacts ?? []).length > 0 && (
          <Section
            icon={<Users size={16} />}
            iconClass="text-warmstone-400"
            title="Contacts mentioned"
            count={scanResult.professional_contacts!.length}
            defaultOpen={false}
          >
            {scanResult.professional_contacts!.map((contact, i) => (
              <div
                key={i}
                className="bg-warmstone-white border border-warmstone-100 rounded-lg p-4"
              >
                <p className="font-semibold text-warmstone-900 text-sm">
                  {contact.name}
                </p>
                {(contact.role || contact.department) && (
                  <p className="text-xs text-warmstone-600 mt-0.5">
                    {[contact.role, contact.department].filter(Boolean).join(", ")}
                  </p>
                )}
                {contact.location && (
                  <p className="text-xs text-warmstone-400">{contact.location}</p>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Spacer so footer doesn't cover content */}
        <div className="h-4" />
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-warmstone-100 px-4 py-4 bg-warmstone-white">
        <div className="flex items-center justify-between mb-3 max-w-2xl mx-auto">
          <p className="text-sm text-warmstone-600">
            <span className="font-bold text-warmstone-900">{selectedCount}</span>{" "}
            {selectedCount === 1 ? "item" : "items"} selected
          </p>
        </div>
        <div className="flex gap-3 max-w-2xl mx-auto">
          <Button variant="ghost" onClick={onDiscard} disabled={saving} fullWidth>
            Discard all
          </Button>
          <Button fullWidth onClick={handleSave} loading={saving}>
            <CheckCircle size={16} />
            Save selected items
          </Button>
        </div>
      </div>
    </div>
  );
}
