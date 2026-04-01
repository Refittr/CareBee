"use client";

import { useState, useEffect, useMemo } from "react";
import type { CalendarData, CalendarAppointment, CalendarMedication, CalendarEntitlementReview, CalendarRepeatPrescription } from "../types";
import { isMedActiveOnDay } from "../useCalendarData";
import type { CalendarView } from "../CalendarPageClient";
import { PERSON_COLORS } from "../CalendarPageClient";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

function padDate(n: number) {
  return String(n).padStart(2, "0");
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${padDate(month)}-${padDate(day)}`;
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function useCalendarDataYear(
  householdId: string,
  year: number
) {
  const [allData, setAllData] = useState<(CalendarData | null)[]>(
    Array(12).fill(null)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetches = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const params = new URLSearchParams({
        householdId,
        year: String(year),
        month: String(month),
      });
      return fetch(`/api/calendar?${params}`)
        .then((r) => (r.ok ? (r.json() as Promise<CalendarData>) : null))
        .catch(() => null);
    });

    Promise.all(fetches).then((results) => {
      if (!cancelled) {
        setAllData(results);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [householdId, year]); // eslint-disable-line react-hooks/exhaustive-deps

  return { allData, loading };
}

interface Props {
  householdId: string;
  year: number;
  hiddenPersonIds: Set<string>;
  personColorMap: Record<string, string>;
  today: Date;
  onNavigate: (date: Date, view: CalendarView) => void;
}

export function YearView({
  householdId,
  year,
  hiddenPersonIds,
  personColorMap,
  today,
  onNavigate,
}: Props) {
  const { allData, loading } = useCalendarDataYear(householdId, year);
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-warmstone-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, idx) => {
        const month = idx + 1;
        const data = allData[idx];
        const days = buildCalendarDays(year, month);

        return (
          <div
            key={month}
            className="bg-warmstone-white border border-warmstone-100 rounded-xl overflow-hidden"
          >
            {/* Month header */}
            <button
              onClick={() =>
                onNavigate(new Date(year, month - 1, 1), "month")
              }
              className="w-full px-3 pt-3 pb-2 text-left hover:bg-warmstone-50 transition-colors"
            >
              <span className="text-xs font-bold text-warmstone-700">
                {MONTH_NAMES[month - 1]}
              </span>
            </button>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 px-1">
              {DAY_HEADERS.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className="text-center text-[9px] font-semibold text-warmstone-400 pb-0.5"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 px-1 pb-2 gap-y-0.5">
              {days.map((day, cellIdx) => {
                if (!day) {
                  return <div key={`e-${cellIdx}`} className="h-5" />;
                }

                const dayStr = toDateStr(year, month, day);
                const isToday = dayStr === todayStr;

                // Compute whether this day has events
                let hasAppt = false;
                let hasMed = false;
                let hasOther = false;
                const apptColor = (() => {
                  if (!data) return null;
                  const appt = data.appointments.find(
                    (a) =>
                      a.appointment_date.slice(0, 10) === dayStr &&
                      !hiddenPersonIds.has(a.person_id)
                  );
                  if (appt) {
                    hasAppt = true;
                    const keys = Object.keys(personColorMap);
                    return keys.length > 1
                      ? (personColorMap[appt.person_id] ?? "#E8A817")
                      : "#E8A817";
                  }
                  return null;
                })();

                if (data) {
                  hasMed = data.medications.some(
                    (m) =>
                      !hiddenPersonIds.has(m.person_id) &&
                      isMedActiveOnDay(m.start_date, m.end_date, dayStr)
                  );
                  hasOther =
                    data.entitlement_reviews.some(
                      (r) => r.review_date === dayStr
                    ) ||
                    data.repeat_prescriptions.some(
                      (rx) => rx.repeat_prescription_date === dayStr
                    );
                }

                const hasDot = hasAppt || hasMed || hasOther;

                return (
                  <button
                    key={dayStr}
                    onClick={() => onNavigate(new Date(year, month - 1, day), "day")}
                    className="flex flex-col items-center justify-start h-6 rounded hover:bg-warmstone-50 transition-colors"
                  >
                    <span
                      className={[
                        "text-[10px] font-semibold w-4 h-4 flex items-center justify-center rounded-full leading-none",
                        isToday
                          ? "bg-honey-400 text-white"
                          : "text-warmstone-700",
                      ].join(" ")}
                    >
                      {day}
                    </span>
                    {hasDot && (
                      <div className="flex gap-0.5 items-center mt-0.5">
                        {hasAppt && (
                          <span
                            className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: apptColor ?? "#E8A817" }}
                          />
                        )}
                        {hasMed && (
                          <span className="w-1 h-1 rounded-full bg-sage-400" />
                        )}
                        {hasOther && (
                          <span className="w-1 h-1 rounded-full bg-info" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
