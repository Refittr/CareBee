"use client";

import { useMemo, useEffect, useRef } from "react";
import { Calendar, Pill, FileText, RotateCcw, MapPin, User, Clock } from "lucide-react";
import { isMedActiveOnDay, getMedTakenStatus } from "../useCalendarData";
import type {
  CalendarData,
  CalendarTakenEntry,
  CalendarAppointment,
  CalendarMedication,
} from "../types";
import { PERSON_COLORS, toDateStr } from "../CalendarPageClient";

const HOUR_HEIGHT = 72; // px per hour
const GRID_START = 7;
const GRID_END = 22;
const GRID_HOURS = GRID_END - GRID_START;
const GRID_TOTAL_PX = GRID_HOURS * HOUR_HEIGHT;

const HOURS = Array.from({ length: GRID_HOURS }, (_, i) => GRID_START + i);

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  missed: "Missed",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "text-info bg-info-light",
  completed: "text-sage-700 bg-sage-50",
  cancelled: "text-warmstone-500 bg-warmstone-100",
  missed: "text-error bg-error-light",
};

function timeToOffset(timeStr: string): number {
  let hour: number, minute: number;
  if (timeStr.length > 8) {
    const d = new Date(timeStr);
    hour = d.getHours();
    minute = d.getMinutes();
  } else {
    [hour, minute] = timeStr.split(":").map(Number);
  }
  const h = Math.max(GRID_START, Math.min(GRID_END - 1, hour));
  return (h - GRID_START + minute / 60) * HOUR_HEIGHT;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatScheduleTime(t: string): string {
  return t.slice(0, 5);
}

function startsInGrid(appt: CalendarAppointment): boolean {
  const h = new Date(appt.appointment_date).getHours();
  return h >= GRID_START && h < GRID_END;
}

interface Props {
  data: CalendarData | null;
  takenLog: CalendarTakenEntry[];
  date: Date;
  hiddenPersonIds: Set<string>;
  personColorMap: Record<string, string>;
  showPersonFilters: boolean;
  today: Date;
  focusIso?: string | null;
  onTakenToggle: (
    medId: string,
    scheduleId: string | null,
    date: string,
    newValue: boolean
  ) => void;
}

export function DayView({
  data,
  takenLog,
  date,
  hiddenPersonIds,
  personColorMap,
  showPersonFilters,
  focusIso,
  onTakenToggle,
}: Props) {
  const dayStr = toDateStr(date);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to the focused appointment's time when arriving from month view
  useEffect(() => {
    if (!focusIso || !scrollRef.current) return;
    const d = new Date(focusIso);
    const offset = (d.getHours() - GRID_START + d.getMinutes() / 60) * HOUR_HEIGHT;
    scrollRef.current.scrollTo({ top: Math.max(0, offset - 80), behavior: "smooth" });
  }, [focusIso]); // eslint-disable-line react-hooks/exhaustive-deps

  const appointments = useMemo<CalendarAppointment[]>(() => {
    if (!data) return [];
    return data.appointments
      .filter(
        (a) =>
          a.appointment_date.slice(0, 10) === dayStr &&
          !hiddenPersonIds.has(a.person_id)
      )
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  }, [data, dayStr, hiddenPersonIds]);

  const medications = useMemo<CalendarMedication[]>(() => {
    if (!data) return [];
    return data.medications.filter(
      (m) =>
        !hiddenPersonIds.has(m.person_id) &&
        isMedActiveOnDay(m.start_date, m.end_date, dayStr)
    );
  }, [data, dayStr, hiddenPersonIds]);

  const entitlementReviews = useMemo(
    () =>
      data?.entitlement_reviews.filter(
        (r) =>
          r.review_date === dayStr && !hiddenPersonIds.has(r.person_id)
      ) ?? [],
    [data, dayStr, hiddenPersonIds]
  );

  const repeatPrescriptions = useMemo(
    () =>
      data?.repeat_prescriptions.filter(
        (rx) =>
          rx.repeat_prescription_date === dayStr &&
          !hiddenPersonIds.has(rx.person_id)
      ) ?? [],
    [data, dayStr, hiddenPersonIds]
  );

  const tpdMeds = medications.filter((m) => m.schedule_type === "times_per_day");
  const specificMeds = medications.filter(
    (m) => m.schedule_type === "specific_times"
  );

  const hasAllDay =
    entitlementReviews.length > 0 ||
    repeatPrescriptions.length > 0 ||
    tpdMeds.length > 0;

  function apptColor(appt: CalendarAppointment): string {
    return showPersonFilters
      ? (personColorMap[appt.person_id] ?? "#E8A817")
      : "#E8A817";
  }

  function personName(personId: string): string {
    const p = data?.people.find((p) => p.id === personId);
    return p ? `${p.first_name} ${p.last_name}` : "";
  }

  // Collect all timed events to decide if grid is needed
  const hasTimedEvents =
    appointments.some(startsInGrid) || specificMeds.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* All-day items */}
      {hasAllDay && (
        <div className="flex flex-col gap-2">
          {entitlementReviews.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 bg-info-light border border-info/20 rounded-xl px-4 py-3"
            >
              <FileText size={15} className="text-info shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-info">{r.benefit_name}</p>
                <p className="text-xs text-info/80">Benefit review due today</p>
                {showPersonFilters && (
                  <p className="text-xs text-info/60 mt-0.5">
                    {personName(r.person_id)}
                  </p>
                )}
              </div>
            </div>
          ))}

          {repeatPrescriptions.map((rx) => (
            <div
              key={rx.id}
              className="flex items-start gap-3 bg-warmstone-50 border border-warmstone-200 rounded-xl px-4 py-3"
            >
              <RotateCcw size={15} className="text-warmstone-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-warmstone-800">{rx.name}</p>
                <p className="text-xs text-warmstone-500">
                  Time to reorder this prescription
                </p>
                {showPersonFilters && (
                  <p className="text-xs text-warmstone-400 mt-0.5">
                    {personName(rx.person_id)}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Times-per-day medications with checkboxes */}
          {tpdMeds.length > 0 && (
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Pill size={15} className="text-sage-500 shrink-0" />
                <h3 className="text-sm font-bold text-warmstone-900">
                  Daily medications
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {tpdMeds.map((med) => {
                  const log = takenLog.find(
                    (l) =>
                      l.medication_id === med.id &&
                      l.schedule_id === null &&
                      l.taken_date === dayStr
                  );
                  const checked = log?.taken ?? false;
                  return (
                    <label
                      key={med.id}
                      className="flex items-center gap-3 cursor-pointer min-h-[40px]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          onTakenToggle(med.id, null, dayStr, e.target.checked)
                        }
                        className="w-4 h-4 accent-sage-400 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={[
                            "text-sm font-semibold",
                            checked
                              ? "text-warmstone-400 line-through"
                              : "text-warmstone-900",
                          ].join(" ")}
                        >
                          {med.name}
                          {med.dosage ? ` ${med.dosage}` : ""}
                        </p>
                        <p className="text-xs text-warmstone-500">
                          {med.times_per_day ?? 1}× daily
                          {med.purpose ? ` · ${med.purpose}` : ""}
                        </p>
                        {showPersonFilters && (
                          <p className="text-xs text-warmstone-400">
                            {personName(med.person_id)}
                          </p>
                        )}
                      </div>
                      <span
                        className={[
                          "text-xs font-semibold shrink-0",
                          checked ? "text-sage-600" : "text-warmstone-400",
                        ].join(" ")}
                      >
                        {checked ? "Taken" : "Not taken"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No events message */}
      {!hasAllDay && !hasTimedEvents && (
        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl py-12 flex items-center justify-center">
          <p className="text-sm text-warmstone-400">
            Nothing scheduled for this day.
          </p>
        </div>
      )}

      {/* Time grid */}
      {hasTimedEvents && (
        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl overflow-hidden">
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 280px)", minHeight: "300px" }}
          >
            <div className="flex">
              {/* Time gutter */}
              <div
                className="w-16 shrink-0 relative border-r border-warmstone-100"
                style={{ height: GRID_TOTAL_PX }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full flex items-start justify-end pr-3"
                    style={{ top: (h - GRID_START) * HOUR_HEIGHT - 8 }}
                  >
                    <span className="text-[11px] text-warmstone-400 font-medium">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Main column */}
              <div
                className="flex-1 relative"
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
                {appointments.filter(startsInGrid).map((appt) => {
                  const top = timeToOffset(appt.appointment_date);
                  const color = apptColor(appt);
                  return (
                    <div
                      key={appt.id}
                      className="absolute left-2 right-2 rounded-xl px-3 py-2 z-10"
                      style={{
                        top,
                        minHeight: HOUR_HEIGHT - 6,
                        backgroundColor: `${color}18`,
                        borderLeft: `4px solid ${color}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={11} style={{ color }} className="shrink-0" />
                            <span
                              className="text-xs font-bold"
                              style={{ color }}
                            >
                              {formatTime(appt.appointment_date)}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-warmstone-900 leading-snug">
                            {appt.title}
                          </p>
                          {appt.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin size={11} className="text-warmstone-400 shrink-0" />
                              <p className="text-xs text-warmstone-500 truncate">
                                {appt.location}
                              </p>
                            </div>
                          )}
                          {appt.professional_name && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <User size={11} className="text-warmstone-400 shrink-0" />
                              <p className="text-xs text-warmstone-500">
                                {appt.professional_name}
                              </p>
                            </div>
                          )}
                          {appt.department && !appt.professional_name && (
                            <p className="text-xs text-warmstone-400 mt-0.5">
                              {appt.department}
                            </p>
                          )}
                          {showPersonFilters && (
                            <p className="text-xs text-warmstone-400 mt-0.5">
                              {personName(appt.person_id)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            STATUS_COLORS[appt.status] ??
                            "text-warmstone-500 bg-warmstone-100"
                          }`}
                        >
                          {STATUS_LABELS[appt.status] ?? appt.status}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Out-of-grid appointments */}
                {appointments.filter((a) => !startsInGrid(a)).map((appt) => (
                  <div
                    key={appt.id}
                    className="absolute left-2 right-2 rounded-xl px-3 py-2 z-10 bg-warmstone-50 border border-warmstone-200"
                    style={{ top: 4 + appointments.indexOf(appt) * 28 }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={11} className="text-honey-500 shrink-0" />
                      <span className="text-xs font-semibold text-warmstone-700">
                        {formatTime(appt.appointment_date)} — {appt.title}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Specific-time medications with checkboxes */}
                {specificMeds.map((med) =>
                  med.schedules.map((slot) => {
                    const top = timeToOffset(slot.time);
                    const log = takenLog.find(
                      (l) =>
                        l.medication_id === med.id &&
                        l.schedule_id === slot.id &&
                        l.taken_date === dayStr
                    );
                    const checked = log?.taken ?? false;
                    return (
                      <label
                        key={`${med.id}-${slot.id}`}
                        className={[
                          "absolute left-2 right-2 flex items-center gap-2 rounded-lg px-3 py-1.5 z-20 cursor-pointer min-h-[36px]",
                          checked
                            ? "bg-sage-50 border border-sage-100"
                            : "bg-warmstone-50 border border-warmstone-100",
                        ].join(" ")}
                        style={{ top: top + 2 }}
                      >
                        <Pill
                          size={12}
                          className={
                            checked ? "text-sage-500 shrink-0" : "text-warmstone-400 shrink-0"
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={[
                              "text-xs font-semibold leading-tight",
                              checked
                                ? "text-sage-700 line-through"
                                : "text-warmstone-800",
                            ].join(" ")}
                          >
                            {med.name}
                            {med.dosage ? ` ${med.dosage}` : ""}
                          </p>
                          <p className="text-[10px] text-warmstone-400">
                            {formatScheduleTime(slot.time)}
                            {med.purpose ? ` · ${med.purpose}` : ""}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            onTakenToggle(
                              med.id,
                              slot.id,
                              dayStr,
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 accent-sage-400 shrink-0"
                        />
                        <span
                          className={[
                            "text-[10px] font-semibold shrink-0 w-16 text-right",
                            checked ? "text-sage-600" : "text-warmstone-400",
                          ].join(" ")}
                        >
                          {checked ? "Taken" : "Not taken"}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
