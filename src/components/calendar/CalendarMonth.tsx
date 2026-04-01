"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Pill, FileText, RotateCcw } from "lucide-react";
import { DayDetailPanel } from "./DayDetailPanel";
import { useCalendarData, getMedTakenStatus, isMedActiveOnDay } from "./useCalendarData";
import type { CalendarTakenEntry, DayContent } from "./types";

// Person color palette — static strings so Tailwind includes them
const PERSON_COLORS = [
  { dot: "#E8A817", label: "honey" },
  { dot: "#5B8A72", label: "sage" },
  { dot: "#4A7FB5", label: "blue" },
  { dot: "#9B59B6", label: "purple" },
  { dot: "#E74C3C", label: "rose" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function padDate(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${padDate(month)}-${padDate(day)}`;
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon = 0
  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month - 1, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

interface CalendarMonthProps {
  householdId: string;
  personId?: string;
}

export function CalendarMonth({ householdId, personId }: CalendarMonthProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hiddenPersonIds, setHiddenPersonIds] = useState<Set<string>>(new Set());

  const { data, takenLog, loading, error, toggleTaken } = useCalendarData(householdId, year, month, personId);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function togglePersonFilter(id: string) {
    setHiddenPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const calendarDays = useMemo(() => buildCalendarDays(year, month), [year, month]);

  function getDayContent(date: Date): DayContent {
    const dayStr = toDateStr(date.getFullYear(), date.getMonth() + 1, date.getDate());
    if (!data) return { appointments: [], medications: [], entitlementReviews: [], repeatPrescriptions: [] };

    return {
      appointments: data.appointments.filter(
        (a) => a.appointment_date.slice(0, 10) === dayStr && !hiddenPersonIds.has(a.person_id)
      ),
      medications: data.medications.filter(
        (m) => !hiddenPersonIds.has(m.person_id) && isMedActiveOnDay(m.start_date, m.end_date, dayStr)
      ),
      entitlementReviews: data.entitlement_reviews.filter(
        (r) => r.review_date === dayStr && !hiddenPersonIds.has(r.person_id)
      ),
      repeatPrescriptions: data.repeat_prescriptions.filter(
        (rx) => rx.repeat_prescription_date === dayStr && !hiddenPersonIds.has(rx.person_id)
      ),
    };
  }

  const selectedContent = useMemo(() => {
    if (!selectedDate || !data) return null;
    const d = new Date(selectedDate + "T00:00:00");
    return getDayContent(d);
  }, [selectedDate, data, takenLog, hiddenPersonIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const showPersonFilters = (data?.people.length ?? 0) > 1;
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div className="flex flex-col gap-4">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-warmstone-900">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-2 text-warmstone-500 hover:text-warmstone-900 hover:bg-warmstone-100 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
            className="px-2 py-1 text-xs font-semibold text-warmstone-600 hover:text-warmstone-900 hover:bg-warmstone-100 rounded-md transition-colors min-h-[36px]"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 text-warmstone-500 hover:text-warmstone-900 hover:bg-warmstone-100 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Person filter toggles (carer mode — multiple people) */}
      {showPersonFilters && data && (
        <div className="flex flex-wrap gap-2">
          {data.people.map((person, idx) => {
            const color = PERSON_COLORS[idx % PERSON_COLORS.length];
            const hidden = hiddenPersonIds.has(person.id);
            return (
              <button
                key={person.id}
                onClick={() => togglePersonFilter(person.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors min-h-[36px] ${
                  hidden
                    ? "border-warmstone-200 text-warmstone-400 bg-warmstone-50"
                    : "border-warmstone-200 text-warmstone-800 bg-warmstone-white"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: hidden ? "#DED8D1" : color.dot }}
                />
                {person.first_name} {person.last_name}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center text-sm text-warmstone-400">Loading...</div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center text-sm text-error">{error}</div>
      ) : (
        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-warmstone-100">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-warmstone-500">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-warmstone-50 last:border-r-0" />;
              }

              const dayStr = toDateStr(date.getFullYear(), date.getMonth() + 1, date.getDate());
              const isToday = dayStr === todayStr;
              const content = getDayContent(date);
              const hasSomething =
                content.appointments.length > 0 ||
                content.medications.length > 0 ||
                content.entitlementReviews.length > 0 ||
                content.repeatPrescriptions.length > 0;

              // Medication taken status summary for this day
              const allMedStatuses = content.medications.map((m) =>
                getMedTakenStatus(m.id, m.schedule_type, m.schedules.length, dayStr, takenLog)
              );
              const allTaken = allMedStatuses.length > 0 && allMedStatuses.every((s) => s === "all");
              const someTaken = allMedStatuses.some((s) => s === "some" || s === "all");
              const pillColor = allTaken ? "text-sage-500" : someTaken ? "text-honey-600" : "text-warmstone-400";

              // Person color dot for appointments (carer mode)
              const personColorMap: Record<string, string> = {};
              if (data) {
                data.people.forEach((p, i) => {
                  personColorMap[p.id] = PERSON_COLORS[i % PERSON_COLORS.length].dot;
                });
              }

              const MAX_INDICATORS = 3;
              let indicatorCount = 0;

              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDate(dayStr)}
                  className={[
                    "min-h-[80px] border-b border-r border-warmstone-100 last:border-r-0 p-1.5 text-left flex flex-col gap-1 transition-colors",
                    isToday ? "bg-honey-50" : hasSomething ? "hover:bg-warmstone-50 cursor-pointer" : "hover:bg-warmstone-50 cursor-pointer",
                    (idx + 1) % 7 === 0 ? "border-r-0" : "",
                  ].join(" ")}
                  aria-label={`${dayStr}${hasSomething ? ", has events" : ""}`}
                >
                  <span
                    className={[
                      "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-honey-400 text-white" : "text-warmstone-800",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </span>

                  {/* Appointment indicators */}
                  {content.appointments.slice(0, MAX_INDICATORS).map((appt) => {
                    indicatorCount++;
                    if (indicatorCount > MAX_INDICATORS) return null;
                    return (
                      <div key={appt.id} className="flex items-center gap-1 w-full overflow-hidden">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: showPersonFilters ? (personColorMap[appt.person_id] ?? "#E8A817") : "#E8A817" }}
                        />
                        <span className="text-[10px] text-warmstone-700 truncate leading-tight">{appt.title}</span>
                      </div>
                    );
                  })}

                  {/* Medication indicator */}
                  {content.medications.length > 0 && indicatorCount < MAX_INDICATORS && (
                    <div className="flex items-center gap-1">
                      <div className="relative group">
                        <Pill size={12} className={pillColor} />
                        {/* Hover tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-0 mb-1 z-50 w-48 rounded-lg bg-warmstone-900 px-3 py-2 text-xs text-warmstone-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {content.medications.slice(0, 3).map((m) => (
                            <p key={m.id} className="leading-snug">
                              <span className="font-semibold">{m.name}</span>
                              {m.dosage ? ` ${m.dosage}` : ""}
                              {m.schedule_type === "times_per_day"
                                ? `, ${m.times_per_day ?? 1}x daily`
                                : m.schedules.length > 0
                                ? ` at ${m.schedules.map((s) => s.time.slice(0, 5)).join(", ")}`
                                : ""}
                              {m.purpose ? ` — ${m.purpose}` : ""}
                            </p>
                          ))}
                          {content.medications.length > 3 && (
                            <p className="text-warmstone-300 mt-1">+{content.medications.length - 3} more</p>
                          )}
                        </div>
                      </div>
                      {content.medications.length > 1 && (
                        <span className="text-[10px] font-semibold text-warmstone-500">{content.medications.length}</span>
                      )}
                    </div>
                  )}

                  {/* Entitlement review indicator */}
                  {content.entitlementReviews.length > 0 && indicatorCount < MAX_INDICATORS && (
                    <FileText size={11} className="text-info shrink-0" />
                  )}

                  {/* Repeat prescription indicator */}
                  {content.repeatPrescriptions.length > 0 && indicatorCount < MAX_INDICATORS && (
                    <RotateCcw size={11} className="text-warmstone-400 shrink-0" />
                  )}

                  {/* +N more overflow */}
                  {(() => {
                    const total =
                      content.appointments.length +
                      (content.medications.length > 0 ? 1 : 0) +
                      (content.entitlementReviews.length > 0 ? 1 : 0) +
                      (content.repeatPrescriptions.length > 0 ? 1 : 0);
                    const shown = Math.min(total, MAX_INDICATORS);
                    const more = total - shown;
                    return more > 0 ? (
                      <span className="text-[10px] text-warmstone-400">+{more} more</span>
                    ) : null;
                  })()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail panel */}
      {selectedDate && selectedContent && data && (
        <DayDetailPanel
          date={selectedDate}
          appointments={selectedContent.appointments}
          medications={selectedContent.medications}
          entitlementReviews={selectedContent.entitlementReviews}
          repeatPrescriptions={selectedContent.repeatPrescriptions}
          takenLog={takenLog.filter((l) => l.taken_date === selectedDate)}
          people={data.people}
          onClose={() => setSelectedDate(null)}
          onTakenToggle={toggleTaken}
        />
      )}
    </div>
  );
}
