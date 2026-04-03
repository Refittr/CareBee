"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarData, CalendarTakenEntry, MedTakenStatus } from "./types";

function mergeTakenEntry(
  prev: CalendarTakenEntry[],
  medId: string,
  scheduleId: string | null,
  date: string,
  taken: boolean
): CalendarTakenEntry[] {
  const idx = prev.findIndex(
    (l) => l.medication_id === medId && l.schedule_id === scheduleId && l.taken_date === date
  );
  if (idx >= 0) {
    const updated = [...prev];
    updated[idx] = { ...updated[idx], taken };
    return updated;
  }
  return [...prev, { medication_id: medId, schedule_id: scheduleId, taken_date: date, taken }];
}

export function getMedTakenStatus(
  medId: string,
  scheduleType: "specific_times" | "times_per_day",
  scheduleCount: number,
  dayStr: string,
  takenLog: CalendarTakenEntry[]
): MedTakenStatus {
  const dayLogs = takenLog.filter((l) => l.medication_id === medId && l.taken_date === dayStr);

  if (scheduleType === "times_per_day") {
    const log = dayLogs.find((l) => l.schedule_id === null);
    return log?.taken ? "all" : "none";
  }

  // specific_times
  if (scheduleCount === 0) return "none";
  const takenCount = dayLogs.filter((l) => l.taken).length;
  if (takenCount === 0) return "none";
  if (takenCount >= scheduleCount) return "all";
  return "some";
}

export function isMedActiveOnDay(
  startDate: string | null,
  endDate: string | null,
  dayStr: string
): boolean {
  if (startDate && startDate > dayStr) return false;
  if (endDate && endDate < dayStr) return false;
  return true;
}

export function useCalendarData(
  householdId: string,
  year: number,
  month: number,
  personId?: string
) {
  const supabase = createClient();
  const [data, setData] = useState<CalendarData | null>(null);
  const [takenLog, setTakenLog] = useState<CalendarTakenEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      householdIds: householdId, // accepts single ID or comma-separated multiple IDs
      year: String(year),
      month: String(month),
    });
    if (personId) params.set("personId", personId);

    fetch(`/api/calendar?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load calendar data.");
        return r.json() as Promise<CalendarData>;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setTakenLog(d.taken_log ?? []);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message ?? "Could not load calendar data.");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [householdId, year, month, personId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTaken = useCallback(
    async (medId: string, scheduleId: string | null, date: string, newValue: boolean) => {
      // Optimistic update
      setTakenLog((prev) => mergeTakenEntry(prev, medId, scheduleId, date, newValue));

      try {
        if (scheduleId !== null) {
          // specific_times: safe to upsert on the unique constraint
          await supabase.from("medication_taken_log").upsert(
            {
              medication_id: medId,
              schedule_id: scheduleId,
              taken_date: date,
              taken: newValue,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "medication_id,schedule_id,taken_date" }
          );
        } else {
          // times_per_day (schedule_id IS NULL): partial unique index, must check manually
          const { data: existing } = await supabase
            .from("medication_taken_log")
            .select("id")
            .eq("medication_id", medId)
            .is("schedule_id", null)
            .eq("taken_date", date)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("medication_taken_log")
              .update({ taken: newValue, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await supabase.from("medication_taken_log").insert({
              medication_id: medId,
              schedule_id: null,
              taken_date: date,
              taken: newValue,
            });
          }
        }
      } catch {
        // Revert optimistic update on failure
        setTakenLog((prev) => mergeTakenEntry(prev, medId, scheduleId, date, !newValue));
      }
    },
    [supabase] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { data, takenLog, loading, error, toggleTaken };
}
