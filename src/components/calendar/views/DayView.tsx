"use client";

import { useMemo, useEffect } from "react";
import { Pill, FileText, MapPin, User, Plus, Tag } from "lucide-react";
import { isMedActiveOnDay } from "../useCalendarData";
import type {
  CalendarData,
  CalendarTakenEntry,
  CalendarAppointment,
  CalendarMedication,
  CalendarEvent,
} from "../types";
import { toDateStr } from "../CalendarPageClient";

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

const CATEGORY_LABELS: Record<string, string> = {
  appointment: "Appointment",
  task: "Task",
  reminder: "Reminder",
  other: "Event",
};

function apptTimeKey(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  calendarEvents: CalendarEvent[];
  onTakenToggle: (
    medId: string,
    scheduleId: string | null,
    date: string,
    newValue: boolean
  ) => void;
  onAddEvent: () => void;
}

export function DayView({
  data,
  takenLog,
  date,
  hiddenPersonIds,
  personColorMap,
  showPersonFilters,
  today,
  focusIso,
  calendarEvents,
  onTakenToggle,
  onAddEvent,
}: Props) {
  const dayStr = toDateStr(date);
  const isFuture = dayStr > toDateStr(today);

  // Scroll to focused appointment
  useEffect(() => {
    if (!focusIso) return;
    const el = document.getElementById(`dayview-appt-${focusIso}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusIso]);

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
        (r) => r.review_date === dayStr && !hiddenPersonIds.has(r.person_id)
      ) ?? [],
    [data, dayStr, hiddenPersonIds]
  );

  const tpdMeds = medications.filter((m) => m.schedule_type === "times_per_day");
  const specificMeds = medications.filter((m) => m.schedule_type === "specific_times");

  const dayCalendarEvents = calendarEvents.filter((e) => e.event_date === dayStr);
  const allDayCalendarEvents = dayCalendarEvents.filter((e) => e.event_time === null);
  const timedCalendarEvents = dayCalendarEvents.filter((e) => e.event_time !== null);

  function personName(personId: string): string {
    const p = data?.people.find((p) => p.id === personId);
    return p ? `${p.first_name} ${p.last_name}` : "";
  }

  function apptColor(appt: CalendarAppointment): string {
    return showPersonFilters
      ? (personColorMap[appt.person_id] ?? "#E8A817")
      : "#E8A817";
  }

  // Build sorted timeline entries
  type TimelineEntry = {
    key: string;
    sortKey: string;
    display: string;
    color: string;
    node: React.ReactNode;
    apptIso?: string;
  };

  const entries: TimelineEntry[] = [];

  // Appointments
  for (const appt of appointments) {
    const timeKey = apptTimeKey(appt.appointment_date);
    const color = apptColor(appt);
    const isFocused = appt.appointment_date === focusIso;
    entries.push({
      key: appt.id,
      sortKey: timeKey,
      display: timeKey,
      color,
      apptIso: appt.appointment_date,
      node: (
        <div
          id={`dayview-appt-${appt.appointment_date}`}
          className="rounded-xl px-3 py-2.5 transition-all"
          style={{
            backgroundColor: `${color}15`,
            borderLeft: `3px solid ${color}`,
            boxShadow: isFocused ? `0 0 0 2px ${color}60` : undefined,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-warmstone-900 leading-snug">
                {appt.title}
              </p>
              {appt.location && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-warmstone-400 shrink-0" />
                  <p className="text-xs text-warmstone-500 truncate">{appt.location}</p>
                </div>
              )}
              {appt.professional_name && (
                <div className="flex items-center gap-1 mt-0.5">
                  <User size={10} className="text-warmstone-400 shrink-0" />
                  <p className="text-xs text-warmstone-500">{appt.professional_name}</p>
                </div>
              )}
              {showPersonFilters && (
                <p className="text-xs text-warmstone-400 mt-0.5">{personName(appt.person_id)}</p>
              )}
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                STATUS_COLORS[appt.status] ?? "text-warmstone-500 bg-warmstone-100"
              }`}
            >
              {STATUS_LABELS[appt.status] ?? appt.status}
            </span>
          </div>
        </div>
      ),
    });
  }

  // Specific-time medications
  for (const med of specificMeds) {
    for (const slot of med.schedules) {
      const display = slot.time.slice(0, 5);
      const log = takenLog.find(
        (l) =>
          l.medication_id === med.id &&
          l.schedule_id === slot.id &&
          l.taken_date === dayStr
      );
      const checked = log?.taken ?? false;
      entries.push({
        key: `${med.id}-${slot.id}`,
        sortKey: display,
        display,
        color: "#5B8A72",
        node: (
          <label
            className={[
              "flex items-center gap-3 rounded-xl px-3 py-2.5 bg-sage-50 border border-sage-100",
              isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            <Pill
              size={13}
              className={checked ? "text-sage-400 shrink-0" : "text-sage-500 shrink-0"}
            />
            <div className="flex-1 min-w-0">
              <p
                className={[
                  "text-sm font-semibold leading-snug",
                  checked ? "text-sage-400 line-through" : "text-sage-900",
                ].join(" ")}
              >
                {med.name}
                {med.dosage ? ` ${med.dosage}` : ""}
              </p>
              {med.purpose && (
                <p className="text-xs text-sage-600/70">{med.purpose}</p>
              )}
              {showPersonFilters && (
                <p className="text-xs text-sage-500">{personName(med.person_id)}</p>
              )}
            </div>
            <input
              type="checkbox"
              checked={checked}
              disabled={isFuture}
              onChange={(e) => onTakenToggle(med.id, slot.id, dayStr, e.target.checked)}
              className="w-4 h-4 accent-sage-400 shrink-0"
            />
            <span
              className={[
                "text-[10px] font-semibold shrink-0 w-16 text-right",
                checked ? "text-sage-600" : "text-sage-400",
              ].join(" ")}
            >
              {isFuture ? "Scheduled" : checked ? "Taken" : "Not taken"}
            </span>
          </label>
        ),
      });
    }
  }

  // Timed calendar events
  for (const event of timedCalendarEvents) {
    const display = event.event_time!.slice(0, 5);
    entries.push({
      key: event.id,
      sortKey: display,
      display,
      color: "#4A7FB5",
      node: (
        <div className="rounded-xl px-3 py-2.5 bg-warmstone-50 border border-warmstone-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-warmstone-900 leading-snug">
                {event.title}
              </p>
              {event.notes && (
                <p className="text-xs text-warmstone-500 mt-0.5">{event.notes}</p>
              )}
            </div>
            <span className="text-xs font-semibold text-warmstone-400 bg-warmstone-100 px-2 py-0.5 rounded-full shrink-0 capitalize">
              {CATEGORY_LABELS[event.category] ?? event.category}
            </span>
          </div>
        </div>
      ),
    });
  }

  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const hasAllDay =
    entitlementReviews.length > 0 || tpdMeds.length > 0 || allDayCalendarEvents.length > 0;
  const hasTimeline = entries.length > 0;
  const isEmpty = !hasAllDay && !hasTimeline;

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-4">
      {/* All-day section */}
      {hasAllDay && (
        <div className="flex flex-col gap-2">
          {/* Entitlement reviews */}
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
                  <p className="text-xs text-info/60 mt-0.5">{personName(r.person_id)}</p>
                )}
              </div>
            </div>
          ))}

          {/* All-day calendar events */}
          {allDayCalendarEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 bg-warmstone-50 border border-warmstone-200 rounded-xl px-4 py-3"
            >
              <Tag size={15} className="text-warmstone-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warmstone-900">{event.title}</p>
                {event.notes && (
                  <p className="text-xs text-warmstone-500 mt-0.5">{event.notes}</p>
                )}
                <p className="text-xs text-warmstone-400 mt-0.5 capitalize">
                  {CATEGORY_LABELS[event.category] ?? event.category}
                </p>
              </div>
            </div>
          ))}

          {/* Times-per-day medications */}
          {tpdMeds.length > 0 && (
            <div className="bg-sage-50 border border-sage-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Pill size={15} className="text-sage-600 shrink-0" />
                <h3 className="text-sm font-bold text-sage-800">Daily medications</h3>
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
                      className={[
                        "flex items-center gap-3 min-h-[40px]",
                        isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isFuture}
                        onChange={(e) => onTakenToggle(med.id, null, dayStr, e.target.checked)}
                        className="w-4 h-4 accent-sage-400 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={[
                            "text-sm font-semibold",
                            checked ? "text-sage-400 line-through" : "text-sage-900",
                          ].join(" ")}
                        >
                          {med.name}
                          {med.dosage ? ` ${med.dosage}` : ""}
                        </p>
                        <p className="text-xs text-sage-600/70">
                          {med.times_per_day ?? 1}x daily
                          {med.purpose ? ` - ${med.purpose}` : ""}
                        </p>
                        {showPersonFilters && (
                          <p className="text-xs text-sage-500">{personName(med.person_id)}</p>
                        )}
                      </div>
                      <span
                        className={[
                          "text-xs font-semibold shrink-0",
                          checked ? "text-sage-600" : "text-sage-400",
                        ].join(" ")}
                      >
                        {isFuture ? "Scheduled" : checked ? "Taken" : "Not taken"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl py-14 flex flex-col items-center justify-center gap-1.5">
          <p className="text-sm text-warmstone-400">Nothing scheduled for this day.</p>
          <p className="text-xs text-warmstone-300">Tap + to add an event.</p>
        </div>
      )}

      {/* Timeline */}
      {hasTimeline && (
        <div className="bg-warmstone-white border border-warmstone-100 rounded-xl overflow-hidden">
          <div className="relative px-4 pt-4 pb-2">
            {/* Continuous vertical line — aligned with dot centres */}
            <div
              className="absolute top-4 bottom-2 pointer-events-none"
              style={{ left: "112px", width: "1px", backgroundColor: "#E5DDD6" }}
            />

            {entries.map((entry) => (
              <div key={entry.key} className="relative flex items-start pb-4">
                {/* Time label (80px wide, right-aligned) */}
                <div
                  className="shrink-0 pt-[13px] pr-3 text-right"
                  style={{ width: "80px" }}
                >
                  <span
                    className="text-[11px] font-semibold tabular-nums"
                    style={{ color: "#A8957A" }}
                  >
                    {entry.display}
                  </span>
                </div>

                {/* Dot — 32px column, centred at px-4(16) + time(80) + 16 = 112px, matches the vertical line */}
                <div
                  className="shrink-0 flex justify-center pt-[14px] relative z-10"
                  style={{ width: "32px" }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: entry.color,
                      boxShadow: "0 0 0 2.5px #FFFFFF",
                    }}
                  />
                </div>

                {/* Content card */}
                <div className="flex-1 min-w-0 pl-2.5">{entry.node}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating + button — mobile sits above the tab bar */}
      <button
        onClick={onAddEvent}
        className="fixed right-4 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform active:scale-95 md:hidden"
        style={{
          bottom: "calc(68px + env(safe-area-inset-bottom))",
          backgroundColor: "#E8A817",
        }}
        aria-label="Add event"
      >
        <Plus size={24} color="#FFFFFF" />
      </button>
      <button
        onClick={onAddEvent}
        className="fixed right-8 bottom-8 z-40 w-14 h-14 rounded-full shadow-xl hidden md:flex items-center justify-center transition-transform active:scale-95"
        style={{ backgroundColor: "#E8A817" }}
        aria-label="Add event"
      >
        <Plus size={24} color="#FFFFFF" />
      </button>
    </div>
  );
}
