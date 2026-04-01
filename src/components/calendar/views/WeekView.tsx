"use client";

import { useMemo } from "react";
import { Pill, FileText, RotateCcw } from "lucide-react";
import { isMedActiveOnDay, getMedTakenStatus } from "../useCalendarData";
import type {
  CalendarData,
  CalendarTakenEntry,
  CalendarAppointment,
  CalendarMedication,
} from "../types";
import { PERSON_COLORS, addDays, toDateStr } from "../CalendarPageClient";

const HOUR_HEIGHT = 64; // px per hour
const GRID_START = 7; // 07:00
const GRID_END = 21; // 21:00
const GRID_HOURS = GRID_END - GRID_START; // 14 hours
const GRID_TOTAL_PX = GRID_HOURS * HOUR_HEIGHT;

const HOURS = Array.from(
  { length: GRID_HOURS },
  (_, i) => GRID_START + i
);

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function timeToOffset(timeStr: string): number {
  // timeStr is ISO datetime or HH:MM:SS
  let hour: number, minute: number;
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    hour = d.getHours();
    minute = d.getMinutes();
  } else {
    [hour, minute] = timeStr.split(":").map(Number);
  }
  const h = Math.max(GRID_START, Math.min(GRID_END - 1, hour));
  return (h - GRID_START + minute / 60) * HOUR_HEIGHT;
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatApptTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function apptStartsInGrid(appt: CalendarAppointment): boolean {
  const h = new Date(appt.appointment_date).getHours();
  return h >= GRID_START && h < GRID_END;
}

interface Props {
  data: CalendarData | null;
  takenLog: CalendarTakenEntry[];
  weekMonday: Date;
  hiddenPersonIds: Set<string>;
  personColorMap: Record<string, string>;
  showPersonFilters: boolean;
  today: Date;
  onDayClick: (date: Date) => void;
  onTakenToggle: (
    medId: string,
    scheduleId: string | null,
    date: string,
    newValue: boolean
  ) => void;
}

export function WeekView({
  data,
  takenLog,
  weekMonday,
  hiddenPersonIds,
  personColorMap,
  showPersonFilters,
  today,
  onDayClick,
}: Props) {
  const todayStr = toDateStr(today);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i)),
    [weekMonday]
  );

  const dayStrs = useMemo(() => days.map((d) => toDateStr(d)), [days]);

  // Appointments per day
  const apptsByDay = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    if (!data) return map;
    for (const dayStr of dayStrs) {
      map[dayStr] = data.appointments
        .filter(
          (a) =>
            a.appointment_date.slice(0, 10) === dayStr &&
            !hiddenPersonIds.has(a.person_id)
        )
        .sort((a, b) =>
          a.appointment_date.localeCompare(b.appointment_date)
        );
    }
    return map;
  }, [data, dayStrs, hiddenPersonIds]);

  // Medications per day (all-day + specific times)
  const medsByDay = useMemo(() => {
    const map: Record<string, CalendarMedication[]> = {};
    if (!data) return map;
    for (const dayStr of dayStrs) {
      map[dayStr] = data.medications.filter(
        (m) =>
          !hiddenPersonIds.has(m.person_id) &&
          isMedActiveOnDay(m.start_date, m.end_date, dayStr)
      );
    }
    return map;
  }, [data, dayStrs, hiddenPersonIds]);

  function apptColor(appt: CalendarAppointment): string {
    return showPersonFilters
      ? (personColorMap[appt.person_id] ?? "#E8A817")
      : "#E8A817";
  }

  return (
    <div className="bg-warmstone-white border border-warmstone-100 rounded-xl overflow-hidden">
      {/* Sticky header: day names + dates */}
      <div className="sticky top-0 z-10 bg-warmstone-white border-b border-warmstone-100 grid grid-cols-[56px_repeat(7,1fr)]">
        <div className="border-r border-warmstone-100" />
        {days.map((day, i) => {
          const dayStr = dayStrs[i];
          const isToday = dayStr === todayStr;
          return (
            <button
              key={dayStr}
              onClick={() => onDayClick(day)}
              className={[
                "py-2.5 text-center border-r border-warmstone-100 last:border-r-0 hover:bg-warmstone-50 transition-colors",
                isToday ? "bg-honey-50" : "",
              ].join(" ")}
            >
              <span className="block text-[10px] font-semibold text-warmstone-500 uppercase tracking-wide">
                {DAY_SHORT[i]}
              </span>
              <span
                className={[
                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mt-0.5",
                  isToday
                    ? "bg-honey-400 text-white"
                    : "text-warmstone-800",
                ].join(" ")}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* All-day row: entitlements, prescriptions, times-per-day meds */}
      {data &&
        dayStrs.some(
          (ds) =>
            (data.entitlement_reviews.some(
              (r) => r.review_date === ds && !hiddenPersonIds.has(r.person_id)
            ) ||
              data.repeat_prescriptions.some(
                (rx) =>
                  rx.repeat_prescription_date === ds &&
                  !hiddenPersonIds.has(rx.person_id)
              ) ||
              (medsByDay[ds] ?? []).some(
                (m) => m.schedule_type === "times_per_day"
              ))
        ) && (
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-warmstone-100 min-h-[32px]">
            <div className="px-1 py-1 text-[9px] font-semibold text-warmstone-400 uppercase tracking-wide border-r border-warmstone-100 flex items-center">
              All day
            </div>
            {dayStrs.map((dayStr) => {
              const reviews = data.entitlement_reviews.filter(
                (r) => r.review_date === dayStr && !hiddenPersonIds.has(r.person_id)
              );
              const rxs = data.repeat_prescriptions.filter(
                (rx) =>
                  rx.repeat_prescription_date === dayStr &&
                  !hiddenPersonIds.has(rx.person_id)
              );
              const tpdMeds = (medsByDay[dayStr] ?? []).filter(
                (m) => m.schedule_type === "times_per_day"
              );
              return (
                <div
                  key={dayStr}
                  className="px-1 py-1 flex flex-col gap-0.5 border-r border-warmstone-100 last:border-r-0"
                >
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-1 bg-info-light rounded px-1 py-0.5"
                    >
                      <FileText size={9} className="text-info shrink-0" />
                      <span className="text-[9px] text-info font-semibold truncate">
                        {r.benefit_name}
                      </span>
                    </div>
                  ))}
                  {rxs.map((rx) => (
                    <div
                      key={rx.id}
                      className="flex items-center gap-1 bg-warmstone-50 rounded px-1 py-0.5"
                    >
                      <RotateCcw size={9} className="text-warmstone-500 shrink-0" />
                      <span className="text-[9px] text-warmstone-600 font-semibold truncate">
                        {rx.name}
                      </span>
                    </div>
                  ))}
                  {tpdMeds.map((m) => {
                    const taken =
                      getMedTakenStatus(
                        m.id,
                        m.schedule_type,
                        m.schedules.length,
                        dayStr,
                        takenLog
                      ) === "all";
                    return (
                      <div
                        key={m.id}
                        className={[
                          "flex items-center gap-1 rounded px-1 py-0.5",
                          taken ? "bg-sage-50" : "bg-warmstone-50",
                        ].join(" ")}
                      >
                        <Pill
                          size={9}
                          className={taken ? "text-sage-500 shrink-0" : "text-warmstone-400 shrink-0"}
                        />
                        <span
                          className={[
                            "text-[9px] font-semibold truncate",
                            taken ? "text-sage-700 line-through" : "text-warmstone-600",
                          ].join(" ")}
                        >
                          {m.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

      {/* Time grid */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: "600px" }}
      >
        <div
          className="grid grid-cols-[56px_repeat(7,1fr)]"
          style={{ height: GRID_TOTAL_PX }}
        >
          {/* Time labels column */}
          <div className="relative border-r border-warmstone-100">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: (h - GRID_START) * HOUR_HEIGHT - 8 }}
              >
                <span className="text-[10px] text-warmstone-400 font-medium">
                  {formatHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => {
            const dayStr = dayStrs[i];
            const isToday = dayStr === todayStr;
            const appts = apptsByDay[dayStr] ?? [];
            const specificTimeMeds = (medsByDay[dayStr] ?? []).filter(
              (m) => m.schedule_type === "specific_times"
            );

            return (
              <div
                key={dayStr}
                className={[
                  "relative border-r border-warmstone-100 last:border-r-0",
                  isToday ? "bg-honey-50/30" : "",
                ].join(" ")}
                style={{ height: GRID_TOTAL_PX }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-b border-warmstone-50"
                    style={{ top: (h - GRID_START) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Appointment blocks */}
                {appts.filter(apptStartsInGrid).map((appt) => {
                  const top = timeToOffset(appt.appointment_date);
                  const color = apptColor(appt);
                  return (
                    <div
                      key={appt.id}
                      className="absolute left-0.5 right-0.5 rounded overflow-hidden px-1.5 py-1 z-10"
                      style={{
                        top,
                        height: HOUR_HEIGHT - 2,
                        backgroundColor: `${color}22`,
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <p
                        className="text-[10px] font-bold leading-tight truncate"
                        style={{ color }}
                      >
                        {formatApptTime(appt.appointment_date)}
                      </p>
                      <p className="text-[10px] font-semibold text-warmstone-800 leading-tight line-clamp-2">
                        {appt.title}
                      </p>
                      {appt.location && (
                        <p className="text-[9px] text-warmstone-500 truncate">
                          {appt.location}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Specific-time medication indicators */}
                {specificTimeMeds.flatMap((med) =>
                  med.schedules.map((slot) => {
                    const top = timeToOffset(slot.time);
                    const taken = takenLog.some(
                      (l) =>
                        l.medication_id === med.id &&
                        l.schedule_id === slot.id &&
                        l.taken_date === dayStr &&
                        l.taken
                    );
                    return (
                      <div
                        key={`${med.id}-${slot.id}`}
                        className="absolute left-1 flex items-center gap-0.5 z-10"
                        style={{ top: top + 2 }}
                      >
                        <Pill
                          size={10}
                          className={
                            taken ? "text-sage-500" : "text-warmstone-400"
                          }
                        />
                        <span className="text-[9px] text-warmstone-500 truncate max-w-[60px]">
                          {med.name}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* Out-of-grid appointments (before 07:00 or after 21:00) */}
                {appts.filter((a) => !apptStartsInGrid(a)).length > 0 && (
                  <div className="absolute bottom-1 right-1 text-[9px] text-warmstone-400">
                    +{appts.filter((a) => !apptStartsInGrid(a)).length} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
