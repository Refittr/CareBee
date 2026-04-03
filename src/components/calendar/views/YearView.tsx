"use client";

import { useState, useEffect, useMemo } from "react";
import type { CalendarData, CalendarWaitingList } from "../types";
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

/** Compute the expected end date of a waitlist as YYYY-MM-DD */
function waitlistEndDate(wl: CalendarWaitingList): string {
  if (!wl.estimated_weeks) return wl.referral_date;
  const d = new Date(wl.referral_date + "T00:00:00");
  d.setDate(d.getDate() + wl.estimated_weeks * 7);
  return `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
}

function useCalendarDataYear(householdIds: string, year: number, personId?: string) {
  const [allData, setAllData] = useState<(CalendarData | null)[]>(Array(12).fill(null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetches = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const params = new URLSearchParams({
        householdIds,
        year: String(year),
        month: String(month),
      });
      if (personId) params.set("personId", personId);
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

    return () => { cancelled = true; };
  }, [householdIds, year, personId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { allData, loading };
}

interface Props {
  householdIds: string; // single or comma-separated
  personId?: string;
  year: number;
  hiddenPersonIds: Set<string>;
  personColorMap: Record<string, string>;
  today: Date;
  onNavigate: (date: Date, view: CalendarView) => void;
}

export function YearView({
  householdIds,
  personId,
  year,
  hiddenPersonIds,
  personColorMap,
  today,
  onNavigate,
}: Props) {
  const { allData, loading } = useCalendarDataYear(householdIds, year, personId);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  // Deduplicate waiting lists across all 12 months (each month returns the full list)
  const allWaitingLists = useMemo(() => {
    const seen = new Set<string>();
    const result: CalendarWaitingList[] = [];
    for (const data of allData) {
      if (!data) continue;
      for (const wl of data.waiting_lists ?? []) {
        if (!seen.has(wl.id) && !hiddenPersonIds.has(wl.person_id)) {
          seen.add(wl.id);
          result.push(wl);
        }
      }
    }
    return result;
  }, [allData, hiddenPersonIds]);

  // Precompute waitlist ranges for fast lookup
  const waitlistRanges = useMemo(() =>
    allWaitingLists.map((wl) => ({
      start: wl.referral_date,
      end: waitlistEndDate(wl),
      personId: wl.person_id,
      department: wl.department,
      estimatedWeeks: wl.estimated_weeks,
    })),
    [allWaitingLists]
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
              onClick={() => onNavigate(new Date(year, month - 1, 1), "month")}
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
                  return <div key={`e-${cellIdx}`} className="h-6" />;
                }

                const dayStr = toDateStr(year, month, day);
                const isToday = dayStr === todayStr;

                // Appointment
                const apptOnDay = data?.appointments.find(
                  (a) =>
                    a.appointment_date.slice(0, 10) === dayStr &&
                    !hiddenPersonIds.has(a.person_id)
                ) ?? null;
                const hasAppt = !!apptOnDay;
                const apptColor = apptOnDay
                  ? Object.keys(personColorMap).length > 1
                    ? (personColorMap[apptOnDay.person_id] ?? "#E8A817")
                    : "#E8A817"
                  : null;

                // Waitlist range checks — keep references for tooltip
                const startingHere = waitlistRanges.filter((r) => r.start === dayStr);
                const endingHere = waitlistRanges.filter((r) => r.end === dayStr && r.start !== dayStr);
                const activeHere = waitlistRanges.filter((r) => dayStr > r.start && dayStr < r.end);
                const inWaitlistRange = waitlistRanges.some((r) => dayStr >= r.start && dayStr <= r.end);
                const isWaitlistStart = startingHere.length > 0;
                const isWaitlistEnd = endingHere.length > 0;

                // Build tooltip text
                const tooltipParts: string[] = [];
                if (apptOnDay) {
                  const apptTime = new Date(apptOnDay.appointment_date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  tooltipParts.push(`Appointment: ${apptOnDay.title} at ${apptTime}${apptOnDay.professional_name ? ` (${apptOnDay.professional_name})` : ""}`);
                }
                for (const r of startingHere) {
                  tooltipParts.push(`Waitlist starts: ${r.department}${r.estimatedWeeks ? ` (~${r.estimatedWeeks} weeks)` : ""}`);
                }
                for (const r of endingHere) {
                  tooltipParts.push(`Expected wait ends: ${r.department}`);
                }
                for (const r of activeHere) {
                  tooltipParts.push(`On waitlist: ${r.department}`);
                }
                const tooltip = tooltipParts.join("\n") || undefined;

                const hasDot = hasAppt || isWaitlistStart || isWaitlistEnd;

                return (
                  <button
                    key={dayStr}
                    onClick={() => onNavigate(new Date(year, month - 1, day), "day")}
                    title={tooltip}
                    className={[
                      "flex flex-col items-center justify-start h-6 rounded transition-colors",
                      inWaitlistRange && !isToday
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "hover:bg-warmstone-50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "text-[10px] font-semibold w-4 h-4 flex items-center justify-center rounded-full leading-none",
                        isToday
                          ? "bg-honey-400 text-white"
                          : inWaitlistRange
                          ? "text-blue-700"
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
                            title={apptOnDay ? `Appointment: ${apptOnDay.title}` : "Appointment"}
                            style={{ backgroundColor: apptColor ?? "#E8A817" }}
                          />
                        )}
                        {isWaitlistStart && (
                          <span
                            className="w-1 h-1 rounded-full bg-blue-500"
                            title={startingHere.map((r) => `Waitlist starts: ${r.department}`).join(", ")}
                          />
                        )}
                        {isWaitlistEnd && !isWaitlistStart && (
                          <span
                            className="w-1 h-1 rounded-full bg-blue-300"
                            title={endingHere.map((r) => `Expected wait ends: ${r.department}`).join(", ")}
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Waitlist legend for this month */}
            {allWaitingLists.some((wl) => {
              const end = waitlistEndDate(wl);
              const monthStart = toDateStr(year, month, 1);
              const monthEnd = toDateStr(year, month, new Date(year, month, 0).getDate());
              return wl.referral_date <= monthEnd && end >= monthStart;
            }) && (
              <div className="px-2 pb-2 flex flex-col gap-0.5">
                {allWaitingLists
                  .filter((wl) => {
                    const end = waitlistEndDate(wl);
                    const monthStart = toDateStr(year, month, 1);
                    const monthEnd = toDateStr(year, month, new Date(year, month, 0).getDate());
                    return wl.referral_date <= monthEnd && end >= monthStart;
                  })
                  .map((wl) => {
                    const colorIdx = Object.keys(personColorMap).indexOf(wl.person_id);
                    const dotColor = colorIdx >= 0
                      ? PERSON_COLORS[colorIdx % PERSON_COLORS.length]
                      : "#4A7FB5";
                    return (
                      <div key={wl.id} className="flex items-center gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-500"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="text-[9px] text-warmstone-500 truncate leading-tight">
                          {wl.department}
                          {wl.estimated_weeks ? ` (~${wl.estimated_weeks}w)` : ""}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
