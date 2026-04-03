"use client";

import { useMemo, useState } from "react";
import { Pill, FileText, RotateCcw, Clock, MapPin, User } from "lucide-react";
import { isMedActiveOnDay, getMedTakenStatus } from "../useCalendarData";
import type {
  CalendarData,
  CalendarTakenEntry,
  CalendarAppointment,
  CalendarMedication,
} from "../types";
import { addDays, toDateStr } from "../CalendarPageClient";
import { DayDetailModal } from "../DayDetailModal";

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function rxDaysUntil(rxDate: string, dayStr: string): number {
  const due = new Date(rxDate + "T00:00:00").getTime();
  const day = new Date(dayStr + "T00:00:00").getTime();
  const diff = Math.round((due - day) / 86400000);
  return diff >= 0 && diff <= 3 ? diff : -1;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  upcoming:  "text-info bg-info-light",
  completed: "text-sage-700 bg-sage-50",
  cancelled: "text-warmstone-500 bg-warmstone-100",
  missed:    "text-error bg-error-light",
};
const STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming", completed: "Completed", cancelled: "Cancelled", missed: "Missed",
};

interface Props {
  data: CalendarData | null;
  takenLog: CalendarTakenEntry[];
  weekMonday: Date;
  hiddenPersonIds: Set<string>;
  personColorMap: Record<string, string>;
  showPersonFilters: boolean;
  today: Date;
  orderedRx: Set<string>;
  dismissedRx: Set<string>;
  onDismissRx: (medId: string, rxDate: string) => void;
  onMarkOrdered: (medId: string, rxDate: string) => void;
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
  orderedRx,
  dismissedRx,
  onDismissRx,
  onMarkOrdered,
  onDayClick,
  onTakenToggle,
}: Props) {
  const todayStr = toDateStr(today);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i)),
    [weekMonday]
  );
  const dayStrs = useMemo(() => days.map((d) => toDateStr(d)), [days]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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
        .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
    }
    return map;
  }, [data, dayStrs, hiddenPersonIds]);

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

  function personName(personId: string): string {
    const p = data?.people.find((p) => p.id === personId);
    return p ? `${p.first_name} ${p.last_name}` : "";
  }

  // ── Day cell content (shared between mobile and desktop) ──────────────────

  function DayCell({ day, idx, compact }: { day: Date; idx: number; compact?: boolean }) {
    const dayStr = dayStrs[idx];
    const isToday = dayStr === todayStr;
    const appts = apptsByDay[dayStr] ?? [];
    const meds = medsByDay[dayStr] ?? [];
    const tpdMeds = meds.filter((m) => m.schedule_type === "times_per_day");
    const specificMeds = meds.filter((m) => m.schedule_type === "specific_times");
    const allMeds = meds;

    const rxList = (data?.repeat_prescriptions ?? []).filter(
      (rx) =>
        rxDaysUntil(rx.repeat_prescription_date, dayStr) >= 0 &&
        !hiddenPersonIds.has(rx.person_id) &&
        !dismissedRx.has(`${rx.id}_${rx.repeat_prescription_date}`)
    );
    const reviews = (data?.entitlement_reviews ?? []).filter(
      (r) => r.review_date === dayStr && !hiddenPersonIds.has(r.person_id)
    );

    const isEmpty =
      appts.length === 0 &&
      allMeds.length === 0 &&
      rxList.length === 0 &&
      reviews.length === 0;

    // On compact (desktop 7-col) mode, show max 3 appts then overflow
    const MAX_APPTS = compact ? 3 : appts.length;
    const shownAppts = appts.slice(0, MAX_APPTS);
    const hiddenApptCount = appts.length - shownAppts.length;

    return (
      <div className={[
        "flex flex-col h-full",
        isToday ? "bg-honey-50/40" : "",
      ].join(" ")}>

        {/* Day header — tappable */}
        <button
          onClick={() => setSelectedDay(day)}
          className={[
            "w-full flex items-center gap-2 px-3 py-2.5 border-b transition-colors text-left hover:bg-warmstone-50 group",
            isToday ? "border-honey-200" : "border-warmstone-100",
          ].join(" ")}
        >
          <span
            className={[
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
              isToday
                ? "bg-honey-400 text-white"
                : "text-warmstone-700 group-hover:bg-warmstone-100",
            ].join(" ")}
          >
            {day.getDate()}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-honey-600" : "text-warmstone-500"}`}>
              {compact ? DAY_SHORT[idx] : DAY_FULL[idx]}
            </p>
            {!isEmpty && (
              <p className="text-[10px] text-warmstone-400 leading-none mt-0.5">
                {[
                  appts.length > 0 ? `${appts.length} appt${appts.length > 1 ? "s" : ""}` : null,
                  allMeds.length > 0 ? `${allMeds.length} med${allMeds.length > 1 ? "s" : ""}` : null,
                  rxList.length > 0 ? "Rx due" : null,
                ].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </button>

        {/* Content */}
        <div className="flex flex-col gap-1.5 p-2 flex-1">

          {/* Empty state */}
          {isEmpty && (
            <p className="text-xs text-warmstone-300 text-center py-3">Nothing</p>
          )}

          {/* Appointment cards */}
          {shownAppts.map((appt) => {
            const color = apptColor(appt);
            return (
              <button
                key={appt.id}
                onClick={() => setSelectedDay(day)}
                className="w-full text-left rounded-lg overflow-hidden transition-all hover:shadow-sm hover:brightness-95 group/appt"
                style={{
                  backgroundColor: `${color}12`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Clock size={10} style={{ color }} className="shrink-0" />
                    <span className="text-[10px] font-bold" style={{ color }}>
                      {fmtTime(appt.appointment_date)}
                    </span>
                    <span
                      className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                        STATUS_COLORS[appt.status] ?? "text-warmstone-500 bg-warmstone-100"
                      }`}
                    >
                      {STATUS_LABELS[appt.status] ?? appt.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-warmstone-900 leading-snug line-clamp-2">
                    {appt.title}
                  </p>
                  {!compact && appt.location && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={9} className="text-warmstone-400 shrink-0" />
                      <p className="text-[10px] text-warmstone-500 truncate">{appt.location}</p>
                    </div>
                  )}
                  {!compact && appt.professional_name && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <User size={9} className="text-warmstone-400 shrink-0" />
                      <p className="text-[10px] text-warmstone-500 truncate">{appt.professional_name}</p>
                    </div>
                  )}
                  {showPersonFilters && (
                    <p className="text-[10px] text-warmstone-400 mt-0.5 truncate">
                      {personName(appt.person_id)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {/* Overflow */}
          {hiddenApptCount > 0 && (
            <button
              onClick={() => setSelectedDay(day)}
              className="text-[10px] font-semibold text-warmstone-400 hover:text-warmstone-700 text-left px-1 transition-colors"
            >
              +{hiddenApptCount} more
            </button>
          )}

          {/* Medications */}
          {allMeds.length > 0 && (
            <button
              onClick={() => setSelectedDay(day)}
              className="w-full text-left rounded-lg bg-sage-50 border border-sage-100 px-2 py-1.5 hover:bg-sage-100 transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Pill size={11} className="text-sage-600 shrink-0" />
                <span className="text-[10px] font-bold text-sage-800">
                  {allMeds.length} medication{allMeds.length > 1 ? "s" : ""}
                </span>
              </div>
              {/* Taken status dots */}
              <div className="flex gap-1 flex-wrap">
                {allMeds.slice(0, compact ? 5 : allMeds.length).map((med) => {
                  const status = getMedTakenStatus(
                    med.id,
                    med.schedule_type,
                    med.schedules.length,
                    dayStr,
                    takenLog
                  );
                  return (
                    <div
                      key={med.id}
                      className={[
                        "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                        status === "all"
                          ? "bg-sage-400"
                          : status === "some"
                          ? "border-2 border-sage-400 bg-sage-50"
                          : "bg-warmstone-200",
                      ].join(" ")}
                      title={`${med.name} - ${status === "all" ? "taken" : status === "some" ? "partial" : "not taken"}`}
                    >
                      <Pill
                        size={8}
                        className={
                          status === "all"
                            ? "text-white"
                            : status === "some"
                            ? "text-sage-400"
                            : "text-warmstone-400"
                        }
                      />
                    </div>
                  );
                })}
                {compact && allMeds.length > 5 && (
                  <span className="text-[9px] text-sage-500 font-semibold self-center">
                    +{allMeds.length - 5}
                  </span>
                )}
              </div>
            </button>
          )}

          {/* Rx reminders */}
          {rxList.map((rx) => {
            const days = rxDaysUntil(rx.repeat_prescription_date, dayStr);
            const isOrdered = orderedRx.has(`${rx.id}_${rx.repeat_prescription_date}`);
            return (
              <button
                key={rx.id}
                onClick={() => setSelectedDay(day)}
                className="w-full text-left rounded-lg px-2 py-1.5 flex items-center gap-1.5 hover:brightness-95 transition-all"
                style={{ backgroundColor: isOrdered ? "#DCFCE7" : "#FEF3C7" }}
              >
                <RotateCcw
                  size={11}
                  style={{ color: isOrdered ? "#16A34A" : "#D97706" }}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] font-bold truncate"
                    style={{ color: isOrdered ? "#16A34A" : "#D97706" }}
                  >
                    {compact ? "Rx" : rx.name}
                  </p>
                  {!compact && (
                    <p className="text-[9px]" style={{ color: isOrdered ? "#16A34A" : "#D97706" }}>
                      {isOrdered ? "Ordered" : days === 0 ? "Due today" : `Due in ${days}d`}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {/* Benefit reviews */}
          {reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedDay(day)}
              className="w-full text-left rounded-lg bg-info-light border border-info/20 px-2 py-1.5 flex items-center gap-1.5 hover:brightness-95 transition-all"
            >
              <FileText size={11} className="text-info shrink-0" />
              <p className="text-[10px] font-bold text-info truncate">
                {compact ? "Review" : r.benefit_name}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE: vertical day list ──────────────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-2">
        {days.map((day, i) => {
          const dayStr = dayStrs[i];
          const isToday = dayStr === todayStr;
          return (
            <div
              key={dayStr}
              className={[
                "bg-warmstone-white border rounded-xl overflow-hidden",
                isToday ? "border-honey-300" : "border-warmstone-100",
              ].join(" ")}
            >
              <DayCell day={day} idx={i} compact={false} />
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP: 7-column card grid ────────────────────────────────────── */}
      <div className="hidden md:block bg-warmstone-white border border-warmstone-100 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-warmstone-100" style={{ minHeight: "400px" }}>
          {days.map((day, i) => {
            const dayStr = dayStrs[i];
            const isToday = dayStr === todayStr;
            return (
              <div
                key={dayStr}
                className={[
                  "flex flex-col min-h-[400px]",
                  isToday ? "bg-honey-50/30" : "",
                ].join(" ")}
              >
                <DayCell day={day} idx={i} compact={true} />
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
