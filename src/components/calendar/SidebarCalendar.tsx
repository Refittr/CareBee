"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Pill, FileText, RotateCcw } from "lucide-react";
import { DayDetailPanel } from "./DayDetailPanel";
import { useCalendarData, getMedTakenStatus, isMedActiveOnDay } from "./useCalendarData";
import type { DayContent } from "./types";

const PERSON_COLORS = [
  "#E8A817", "#5B8A72", "#4A7FB5", "#9B59B6", "#E74C3C",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

function padDate(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${padDate(month)}-${padDate(day)}`;
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month - 1, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

interface SidebarCalendarProps {
  householdId: string;
}

export function SidebarCalendar({ householdId }: SidebarCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hiddenPersonIds, setHiddenPersonIds] = useState<Set<string>>(new Set());

  const { data, takenLog, loading, toggleTaken } = useCalendarData(householdId, year, month);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function togglePerson(id: string) {
    setHiddenPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const calendarDays = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const showPersonFilters = (data?.people.length ?? 0) > 1;

  const personColorMap: Record<string, string> = {};
  data?.people.forEach((p, i) => {
    personColorMap[p.id] = PERSON_COLORS[i % PERSON_COLORS.length];
  });

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
    return getDayContent(new Date(selectedDate + "T00:00:00"));
  }, [selectedDate, data, takenLog, hiddenPersonIds]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-3 py-3">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1 text-warmstone-400 hover:text-warmstone-800 rounded transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-bold text-warmstone-700">
          {MONTH_SHORT[month - 1]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 text-warmstone-400 hover:text-warmstone-800 rounded transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Person filter toggles */}
      {showPersonFilters && data && (
        <div className="flex flex-wrap gap-1 mb-2">
          {data.people.map((person, idx) => {
            const color = PERSON_COLORS[idx % PERSON_COLORS.length];
            const hidden = hiddenPersonIds.has(person.id);
            return (
              <button
                key={person.id}
                onClick={() => togglePerson(person.id)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                  hidden
                    ? "border-warmstone-200 text-warmstone-400"
                    : "border-warmstone-200 text-warmstone-700"
                }`}
                title={`${person.first_name} ${person.last_name}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: hidden ? "#DED8D1" : color }}
                />
                {person.first_name}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <span className="text-[10px] text-warmstone-400">Loading...</span>
        </div>
      ) : (
        <div>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-0.5">
            {DAY_HEADERS.map((d, i) => (
              <div key={`${d}-${i}`} className="text-center text-[9px] font-semibold text-warmstone-400 py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }

              const dayStr = toDateStr(date.getFullYear(), date.getMonth() + 1, date.getDate());
              const isToday = dayStr === todayStr;
              const content = getDayContent(date);

              const hasSomething =
                content.appointments.length > 0 ||
                content.medications.length > 0 ||
                content.entitlementReviews.length > 0 ||
                content.repeatPrescriptions.length > 0;

              const allMedStatuses = content.medications.map((m) =>
                getMedTakenStatus(m.id, m.schedule_type, m.schedules.length, dayStr, takenLog)
              );
              const allMedsTaken = allMedStatuses.length > 0 && allMedStatuses.every((s) => s === "all");
              const someMedsTaken = allMedStatuses.some((s) => s === "some" || s === "all");
              const pillColor = allMedsTaken ? "#5B8A72" : someMedsTaken ? "#E8A817" : "#A39D96";

              // Appointment dot color (first appointment's person color, or honey for single-person)
              const apptDotColor =
                content.appointments.length > 0
                  ? (showPersonFilters
                      ? (personColorMap[content.appointments[0].person_id] ?? "#E8A817")
                      : "#E8A817")
                  : null;

              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDate(dayStr)}
                  className={[
                    "h-8 flex flex-col items-center justify-start pt-0.5 rounded-md transition-colors",
                    isToday ? "bg-honey-50" : hasSomething ? "hover:bg-warmstone-50" : "hover:bg-warmstone-50",
                    hasSomething ? "cursor-pointer" : "cursor-pointer",
                  ].join(" ")}
                  aria-label={dayStr}
                >
                  <span
                    className={[
                      "text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full leading-none",
                      isToday ? "bg-honey-400 text-white" : "text-warmstone-700",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </span>

                  {/* Tiny indicator dots */}
                  {hasSomething && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {apptDotColor && (
                        <span
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: apptDotColor }}
                        />
                      )}
                      {content.medications.length > 0 && (
                        <Pill size={8} style={{ color: pillColor }} />
                      )}
                      {content.entitlementReviews.length > 0 && (
                        <FileText size={8} className="text-info" />
                      )}
                      {content.repeatPrescriptions.length > 0 && (
                        <RotateCcw size={8} className="text-warmstone-400" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail modal */}
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
