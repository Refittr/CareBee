"use client";

import { useState, useMemo } from "react";
import { Pill, FileText, RotateCcw } from "lucide-react";
import { getMedTakenStatus, isMedActiveOnDay } from "../useCalendarData";
import type {
  CalendarData,
  CalendarTakenEntry,
  DayContent,
} from "../types";
import { DayDetailModal } from "../DayDetailModal";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function padDate(n: number): string {
  return String(n).padStart(2, "0");
}
function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${padDate(month)}-${padDate(day)}`;
}
/** Returns days until the rx date (0 = due today, 1-3 = upcoming). -1 = not a reminder day. */
function rxDaysUntil(rxDate: string, dayStr: string): number {
  const due = new Date(rxDate + "T00:00:00").getTime();
  const day = new Date(dayStr + "T00:00:00").getTime();
  const diff = Math.round((due - day) / 86400000);
  return diff >= 0 && diff <= 3 ? diff : -1;
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
  orderedRx: Set<string>;
  dismissedRx: Set<string>;
  onDismissRx: (medId: string, rxDate: string) => void;
  onMarkOrdered: (medId: string, rxDate: string) => void;
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
  orderedRx,
  dismissedRx,
  onDismissRx,
  onMarkOrdered,
  onDayClick,
  onAppointmentDayView,
  onTakenToggle,
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

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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
          rxDaysUntil(rx.repeat_prescription_date, dayStr) >= 0 &&
          !hiddenPersonIds.has(rx.person_id) &&
          !dismissedRx.has(`${rx.id}_${rx.repeat_prescription_date}`)
      ),
    };
  }

  const MAX_INDICATORS = 3;

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
                  className="min-h-[72px] border-b border-r border-warmstone-50 last:border-r-0"
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
              <div
                key={dayStr}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDay(date)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedDay(date);
                }}
                className={[
                  "min-h-[72px] border-b border-r border-warmstone-100 p-1.5 text-left flex flex-col gap-0.5 cursor-pointer transition-colors hover:bg-warmstone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey-400",
                  isToday ? "bg-honey-50" : "",
                  (idx + 1) % 7 === 0 ? "border-r-0" : "",
                ].join(" ")}
                aria-label={`${dayStr}${hasSomething ? ", has events" : ""}`}
              >
                {/* Date number */}
                <span
                  className={[
                    "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0",
                    isToday ? "bg-honey-400 text-white" : "text-warmstone-800",
                  ].join(" ")}
                >
                  {date.getDate()}
                </span>

                {/* Appointment dots */}
                {content.appointments.slice(0, MAX_INDICATORS).map((appt) => {
                  indicatorCount++;
                  if (indicatorCount > MAX_INDICATORS) return null;
                  const color = showPersonFilters
                    ? (personColorMap[appt.person_id] ?? "#E8A817")
                    : "#E8A817";
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center gap-1 w-full overflow-hidden px-0.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      {/* Title only on larger screens */}
                      <span className="hidden sm:block text-[10px] font-medium text-warmstone-700 truncate leading-tight">
                        {appt.title}
                      </span>
                    </div>
                  );
                })}

                {/* Medication pills */}
                {content.medications.length > 0 &&
                  indicatorCount < MAX_INDICATORS && (
                    <div className="flex items-center flex-wrap gap-0.5 px-0.5 pt-0.5">
                      {content.medications.slice(0, 4).map((med) => {
                        const status = getMedTakenStatus(
                          med.id,
                          med.schedule_type,
                          med.schedules.length,
                          dayStr,
                          takenLog
                        );
                        return (
                          <div key={med.id}>
                            {status === "all" ? (
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "#5B8A72" }}
                              >
                                <Pill size={9} className="text-white" />
                              </div>
                            ) : status === "some" ? (
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ border: "2px solid #5B8A72" }}
                              >
                                <Pill size={9} style={{ color: "#5B8A72" }} />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full flex items-center justify-center bg-warmstone-100">
                                <Pill size={9} className="text-warmstone-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {content.medications.length > 4 && (
                        <span className="text-[9px] font-semibold text-warmstone-400">
                          +{content.medications.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                {/* Entitlement review dot */}
                {content.entitlementReviews.length > 0 &&
                  indicatorCount < MAX_INDICATORS && (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-info-light ml-0.5">
                      <FileText size={9} className="text-info" />
                    </div>
                  )}

                {/* Rx indicators — icon only on mobile, short label on desktop */}
                {content.repeatPrescriptions.map((rx) => {
                  if (indicatorCount >= MAX_INDICATORS) return null;
                  indicatorCount++;
                  const isOrdered = orderedRx.has(
                    `${rx.id}_${rx.repeat_prescription_date}`
                  );
                  const days = rxDaysUntil(rx.repeat_prescription_date, dayStr);
                  const label = days === 0 ? "Due" : `${days}d`;

                  return (
                    <div
                      key={rx.id}
                      className="flex items-center gap-0.5 px-0.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: isOrdered ? "#DCFCE7" : "#FEF3C7",
                      }}
                    >
                      <RotateCcw
                        size={9}
                        style={{ color: isOrdered ? "#16A34A" : "#D97706" }}
                        className="shrink-0"
                      />
                      {/* Label only on larger screens where there's space */}
                      <span
                        className="text-[9px] font-semibold leading-none hidden sm:inline"
                        style={{ color: isOrdered ? "#16A34A" : "#D97706" }}
                      >
                        {isOrdered ? "Ordered" : `Rx ${label}`}
                      </span>
                    </div>
                  );
                })}

                {/* Overflow count */}
                {(() => {
                  const total =
                    content.appointments.length +
                    (content.medications.length > 0 ? 1 : 0) +
                    (content.entitlementReviews.length > 0 ? 1 : 0) +
                    content.repeatPrescriptions.length;
                  const shown = Math.min(total, MAX_INDICATORS);
                  const more = total - shown;
                  return more > 0 ? (
                    <span className="text-[9px] text-warmstone-400 px-0.5">
                      +{more}
                    </span>
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail modal */}
      <DayDetailModal
        date={selectedDay}
        onClose={() => setSelectedDay(null)}
        data={data}
        takenLog={takenLog}
        hiddenPersonIds={hiddenPersonIds}
        personColorMap={personColorMap}
        showPersonFilters={showPersonFilters}
        today={today}
        orderedRx={orderedRx}
        dismissedRx={dismissedRx}
        onDismissRx={onDismissRx}
        onMarkOrdered={onMarkOrdered}
        onTakenToggle={onTakenToggle}
        onViewDay={(d) => {
          setSelectedDay(null);
          onDayClick(d);
        }}
      />
    </>
  );
}
