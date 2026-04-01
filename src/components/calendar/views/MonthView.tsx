"use client";

import { useState, useMemo } from "react";
import { Pill, FileText, RotateCcw, Clock, MapPin, User, CalendarDays } from "lucide-react";
import { getMedTakenStatus, isMedActiveOnDay } from "../useCalendarData";
import type {
  CalendarData,
  CalendarTakenEntry,
  CalendarAppointment,
  DayContent,
} from "../types";
import { Modal } from "@/components/ui/Modal";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function padDate(n: number): string {
  return String(n).padStart(2, "0");
}
function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${padDate(month)}-${padDate(day)}`;
}
function formatApptTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

interface Props {
  data: CalendarData | null;
  takenLog: CalendarTakenEntry[];
  year: number;
  month: number;
  hiddenPersonIds: Set<string>;
  personColorMap: Record<string, string>;
  showPersonFilters: boolean;
  today: Date;
  onDayClick: (date: Date) => void;
  onAppointmentDayView: (date: Date, apptIso: string) => void;
  onTakenToggle: (
    medId: string,
    scheduleId: string | null,
    date: string,
    newValue: boolean
  ) => void;
}

export function MonthView({
  data,
  takenLog,
  year,
  month,
  hiddenPersonIds,
  personColorMap,
  showPersonFilters,
  today,
  onDayClick,
  onAppointmentDayView,
}: Props) {
  const calendarDays = useMemo(
    () => buildCalendarDays(year, month),
    [year, month]
  );
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  const [selectedAppt, setSelectedAppt] = useState<{
    appt: CalendarAppointment;
    date: Date;
  } | null>(null);

  function getDayContent(date: Date): DayContent {
    const dayStr = toDateStr(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
    if (!data)
      return {
        appointments: [],
        medications: [],
        entitlementReviews: [],
        repeatPrescriptions: [],
      };
    return {
      appointments: data.appointments.filter(
        (a) =>
          a.appointment_date.slice(0, 10) === dayStr &&
          !hiddenPersonIds.has(a.person_id)
      ),
      medications: data.medications.filter(
        (m) =>
          !hiddenPersonIds.has(m.person_id) &&
          isMedActiveOnDay(m.start_date, m.end_date, dayStr)
      ),
      entitlementReviews: data.entitlement_reviews.filter(
        (r) => r.review_date === dayStr && !hiddenPersonIds.has(r.person_id)
      ),
      repeatPrescriptions: data.repeat_prescriptions.filter(
        (rx) =>
          rx.repeat_prescription_date === dayStr &&
          !hiddenPersonIds.has(rx.person_id)
      ),
    };
  }

  const MAX_INDICATORS = 3;

  const selectedPersonName = selectedAppt
    ? (() => {
        const p = data?.people.find(
          (p) => p.id === selectedAppt.appt.person_id
        );
        return p ? `${p.first_name} ${p.last_name}` : null;
      })()
    : null;

  return (
    <>
      <div className="bg-warmstone-white border border-warmstone-100 rounded-xl overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-warmstone-100">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-warmstone-500"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, idx) => {
            if (!date) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[80px] border-b border-r border-warmstone-50 last:border-r-0"
                />
              );
            }

            const dayStr = toDateStr(
              date.getFullYear(),
              date.getMonth() + 1,
              date.getDate()
            );
            const isToday = dayStr === todayStr;
            const content = getDayContent(date);
            const hasSomething =
              content.appointments.length > 0 ||
              content.medications.length > 0 ||
              content.entitlementReviews.length > 0 ||
              content.repeatPrescriptions.length > 0;

            let indicatorCount = 0;

            return (
              // div + role="button" so we can nest real <button>s for appointments
              <div
                key={dayStr}
                role="button"
                tabIndex={0}
                onClick={() => onDayClick(date)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onDayClick(date);
                }}
                className={[
                  "min-h-[80px] border-b border-r border-warmstone-100 p-1.5 text-left flex flex-col gap-0.5 cursor-pointer transition-colors hover:bg-warmstone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey-400",
                  isToday ? "bg-honey-50" : "",
                  (idx + 1) % 7 === 0 ? "border-r-0" : "",
                ].join(" ")}
                aria-label={`${dayStr}${hasSomething ? ", has events" : ""}`}
              >
                <span
                  className={[
                    "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0",
                    isToday ? "bg-honey-400 text-white" : "text-warmstone-800",
                  ].join(" ")}
                >
                  {date.getDate()}
                </span>

                {/* Appointment indicators — each is its own button */}
                {content.appointments.slice(0, MAX_INDICATORS).map((appt) => {
                  indicatorCount++;
                  if (indicatorCount > MAX_INDICATORS) return null;
                  const color = showPersonFilters
                    ? (personColorMap[appt.person_id] ?? "#E8A817")
                    : "#E8A817";
                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppt({ appt, date });
                      }}
                      className="group relative w-full text-left rounded px-1 py-0.5 hover:bg-black/5 transition-colors -mx-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-honey-400"
                      style={{ minHeight: 24 }}
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] font-medium text-warmstone-700 truncate leading-tight">
                          {appt.title}
                        </span>
                      </div>

                      {/* Hover tooltip — desktop only, pointer-events-none so it doesn't block clicks.
                          No bottom margin: the tooltip sits flush against the button so the
                          mouse doesn't cross a gap and lose hover state. */}
                      <div
                        className="pointer-events-none absolute bottom-full left-0 z-50 w-56 rounded-xl px-3 pt-2.5 pb-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: "#1C1917" }}
                      >
                        <p
                          className="text-[10px] font-bold mb-1"
                          style={{ color }}
                        >
                          {formatApptTime(appt.appointment_date)}
                        </p>
                        <p className="text-xs font-semibold text-white leading-snug">
                          {appt.title}
                        </p>
                        {(appt.location ||
                          appt.professional_name ||
                          appt.department) && (
                          <div className="flex flex-col gap-0.5 mt-1.5 pt-1.5 border-t border-white/10">
                            {appt.location && (
                              <p className="text-[10px] text-gray-300 flex items-center gap-1">
                                <MapPin size={9} className="shrink-0" />
                                {appt.location}
                              </p>
                            )}
                            {appt.professional_name && (
                              <p className="text-[10px] text-gray-300 flex items-center gap-1">
                                <User size={9} className="shrink-0" />
                                {appt.professional_name}
                              </p>
                            )}
                            {appt.department && !appt.professional_name && (
                              <p className="text-[10px] text-gray-300">
                                {appt.department}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Medication pills — one per medication, green when taken */}
                {content.medications.length > 0 &&
                  indicatorCount < MAX_INDICATORS && (
                    <div className="flex items-center flex-wrap gap-1 px-1 pt-0.5">
                      {content.medications.slice(0, 6).map((med) => {
                        const status = getMedTakenStatus(
                          med.id,
                          med.schedule_type,
                          med.schedules.length,
                          dayStr,
                          takenLog
                        );
                        return (
                          <div key={med.id} className="relative group/pill">
                            {status === "all" ? (
                              // Fully taken — solid green circle
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "#5B8A72" }}
                              >
                                <Pill size={11} className="text-white" />
                              </div>
                            ) : status === "some" ? (
                              // Partially taken — green outline circle
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ border: "2px solid #5B8A72" }}
                              >
                                <Pill size={11} style={{ color: "#5B8A72" }} />
                              </div>
                            ) : (
                              // Not taken — gray circle
                              <div className="w-5 h-5 rounded-full flex items-center justify-center bg-warmstone-100">
                                <Pill size={11} className="text-warmstone-400" />
                              </div>
                            )}
                            {/* Per-pill tooltip */}
                            <div
                              className="pointer-events-none absolute bottom-full left-0 z-50 w-44 rounded-xl px-2.5 pt-2 pb-2.5 shadow-xl opacity-0 group-hover/pill:opacity-100 transition-opacity"
                              style={{ backgroundColor: "#1C1917" }}
                            >
                              <p className="text-[10px] font-semibold text-white leading-snug">
                                {med.name}
                              </p>
                              {med.dosage && (
                                <p className="text-[9px] text-gray-400 mt-0.5">
                                  {med.dosage}
                                </p>
                              )}
                              <p
                                className={[
                                  "text-[9px] font-semibold mt-1",
                                  status === "all"
                                    ? "text-sage-400"
                                    : status === "some"
                                    ? "text-honey-400"
                                    : "text-gray-500",
                                ].join(" ")}
                              >
                                {status === "all"
                                  ? "✓ Taken"
                                  : status === "some"
                                  ? "Partially taken"
                                  : "Not taken"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {content.medications.length > 6 && (
                        <span className="text-[9px] font-semibold text-warmstone-400">
                          +{content.medications.length - 6}
                        </span>
                      )}
                    </div>
                  )}

                {/* Entitlement review indicator */}
                {content.entitlementReviews.length > 0 &&
                  indicatorCount < MAX_INDICATORS && (
                    <FileText size={11} className="text-info shrink-0 ml-1" />
                  )}

                {/* Repeat prescription indicator */}
                {content.repeatPrescriptions.length > 0 &&
                  indicatorCount < MAX_INDICATORS && (
                    <RotateCcw
                      size={11}
                      className="text-warmstone-400 shrink-0 ml-1"
                    />
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
                    <span className="text-[10px] text-warmstone-400 px-1">
                      +{more} more
                    </span>
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointment detail modal */}
      {selectedAppt && (
        <Modal
          open
          onClose={() => setSelectedAppt(null)}
          title={selectedAppt.appt.title}
          maxWidth="sm"
        >
          <div className="flex flex-col gap-4">
            {/* Date + time */}
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-honey-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warmstone-900">
                  {formatApptTime(selectedAppt.appt.appointment_date)}
                </p>
                <p className="text-xs text-warmstone-500">
                  {formatDisplayDate(selectedAppt.appt.appointment_date)}
                </p>
              </div>
              <span
                className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  STATUS_COLORS[selectedAppt.appt.status] ??
                  "text-warmstone-500 bg-warmstone-100"
                }`}
              >
                {STATUS_LABELS[selectedAppt.appt.status] ??
                  selectedAppt.appt.status}
              </span>
            </div>

            {/* Location */}
            {selectedAppt.appt.location && (
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-warmstone-400 shrink-0 mt-0.5" />
                <p className="text-sm text-warmstone-700">
                  {selectedAppt.appt.location}
                </p>
              </div>
            )}

            {/* Professional */}
            {selectedAppt.appt.professional_name && (
              <div className="flex items-start gap-3">
                <User size={16} className="text-warmstone-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-warmstone-700">
                    {selectedAppt.appt.professional_name}
                  </p>
                  {selectedAppt.appt.department && (
                    <p className="text-xs text-warmstone-400">
                      {selectedAppt.appt.department}
                    </p>
                  )}
                </div>
              </div>
            )}
            {!selectedAppt.appt.professional_name &&
              selectedAppt.appt.department && (
                <div className="flex items-start gap-3">
                  <User
                    size={16}
                    className="text-warmstone-400 shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-warmstone-700">
                    {selectedAppt.appt.department}
                  </p>
                </div>
              )}

            {/* Person (carer mode) */}
            {showPersonFilters && selectedPersonName && (
              <p className="text-xs text-warmstone-400 border-t border-warmstone-100 pt-3">
                For {selectedPersonName}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 border-t border-warmstone-100 pt-4 mt-2">
              <button
                onClick={() => {
                  const { appt, date } = selectedAppt;
                  setSelectedAppt(null);
                  onAppointmentDayView(date, appt.appointment_date);
                }}
                className="w-full flex items-center justify-center gap-2 bg-honey-400 hover:bg-honey-500 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors min-h-[44px]"
              >
                <CalendarDays size={16} />
                View in day calendar
              </button>
              <button
                onClick={() => setSelectedAppt(null)}
                className="w-full text-sm font-semibold text-warmstone-500 hover:text-warmstone-800 py-2 transition-colors min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
