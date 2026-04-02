"use client";

import {
  Pill, FileText, RotateCcw, Clock, MapPin, User,
  CalendarDays, X, Check,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { isMedActiveOnDay } from "./useCalendarData";
import type {
  CalendarData,
  CalendarTakenEntry,
  CalendarAppointment,
} from "./types";
import { toDateStr } from "./CalendarPageClient";

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

function rxDaysUntil(rxDate: string, dayStr: string): number {
  const due = new Date(rxDate + "T00:00:00").getTime();
  const day = new Date(dayStr + "T00:00:00").getTime();
  const diff = Math.round((due - day) / 86400000);
  return diff >= 0 && diff <= 3 ? diff : -1;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  date: Date | null;
  onClose: () => void;
  data: CalendarData | null;
  takenLog: CalendarTakenEntry[];
  hiddenPersonIds: Set<string>;
  personColorMap: Record<string, string>;
  showPersonFilters: boolean;
  today: Date;
  orderedRx: Set<string>;
  dismissedRx: Set<string>;
  onDismissRx: (medId: string, rxDate: string) => void;
  onMarkOrdered: (medId: string, rxDate: string) => void;
  onTakenToggle: (
    medId: string,
    scheduleId: string | null,
    date: string,
    newValue: boolean
  ) => void;
  onViewDay: (date: Date) => void;
}

export function DayDetailModal({
  date,
  onClose,
  data,
  takenLog,
  hiddenPersonIds,
  personColorMap,
  showPersonFilters,
  today,
  orderedRx,
  dismissedRx,
  onDismissRx,
  onMarkOrdered,
  onTakenToggle,
  onViewDay,
}: Props) {
  if (!date) return null;

  const dayStr = toDateStr(date);
  const isFuture = dayStr > toDateStr(today);

  const appointments = (data?.appointments ?? [])
    .filter(
      (a) =>
        a.appointment_date.slice(0, 10) === dayStr &&
        !hiddenPersonIds.has(a.person_id)
    )
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  const medications = (data?.medications ?? []).filter(
    (m) =>
      !hiddenPersonIds.has(m.person_id) &&
      isMedActiveOnDay(m.start_date, m.end_date, dayStr)
  );
  const tpdMeds = medications.filter((m) => m.schedule_type === "times_per_day");
  const specificMeds = medications.filter(
    (m) => m.schedule_type === "specific_times"
  );

  const entitlementReviews = (data?.entitlement_reviews ?? []).filter(
    (r) => r.review_date === dayStr && !hiddenPersonIds.has(r.person_id)
  );

  const rxReminders = (data?.repeat_prescriptions ?? []).filter(
    (rx) =>
      rxDaysUntil(rx.repeat_prescription_date, dayStr) >= 0 &&
      !hiddenPersonIds.has(rx.person_id) &&
      !dismissedRx.has(`${rx.id}_${rx.repeat_prescription_date}`)
  );

  const isEmpty =
    appointments.length === 0 &&
    medications.length === 0 &&
    entitlementReviews.length === 0 &&
    rxReminders.length === 0;

  function personName(personId: string): string {
    const p = data?.people.find((p) => p.id === personId);
    return p ? `${p.first_name} ${p.last_name}` : "";
  }

  function apptColor(appt: CalendarAppointment): string {
    return showPersonFilters
      ? (personColorMap[appt.person_id] ?? "#E8A817")
      : "#E8A817";
  }

  const title = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Modal open onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col gap-5">
        {/* Empty state */}
        {isEmpty && (
          <p className="text-sm text-warmstone-400 text-center py-4">
            Nothing scheduled for this day.
          </p>
        )}

        {/* Appointments */}
        {appointments.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-warmstone-500 uppercase tracking-wide">
              Appointments
            </h3>
            {appointments.map((appt) => {
              const color = apptColor(appt);
              return (
                <div
                  key={appt.id}
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor: `${color}15`,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Clock size={11} style={{ color }} className="shrink-0" />
                        <span className="text-xs font-bold" style={{ color }}>
                          {fmtTime(appt.appointment_date)}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-warmstone-900 leading-snug">
                        {appt.title}
                      </p>
                      {appt.location && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-warmstone-400 shrink-0" />
                          <p className="text-xs text-warmstone-500 truncate">
                            {appt.location}
                          </p>
                        </div>
                      )}
                      {appt.professional_name && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <User size={10} className="text-warmstone-400 shrink-0" />
                          <p className="text-xs text-warmstone-500">
                            {appt.professional_name}
                          </p>
                        </div>
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
          </div>
        )}

        {/* Medications */}
        {(tpdMeds.length > 0 || specificMeds.length > 0) && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-warmstone-500 uppercase tracking-wide">
              Medications
            </h3>
            <div className="bg-sage-50 border border-sage-100 rounded-xl px-3 py-2 flex flex-col gap-2">
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
                      onChange={(e) =>
                        onTakenToggle(med.id, null, dayStr, e.target.checked)
                      }
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
                        <p className="text-xs text-sage-500">
                          {personName(med.person_id)}
                        </p>
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

              {specificMeds.map((med) =>
                med.schedules.map((slot) => {
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
                        "flex items-center gap-3 min-h-[40px]",
                        isFuture ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isFuture}
                        onChange={(e) =>
                          onTakenToggle(med.id, slot.id, dayStr, e.target.checked)
                        }
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
                          {slot.time.slice(0, 5)}
                          {med.purpose ? ` - ${med.purpose}` : ""}
                        </p>
                        {showPersonFilters && (
                          <p className="text-xs text-sage-500">
                            {personName(med.person_id)}
                          </p>
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
                })
              )}
            </div>
          </div>
        )}

        {/* Rx reminders */}
        {rxReminders.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-warmstone-500 uppercase tracking-wide">
              Prescriptions
            </h3>
            {rxReminders.map((rx) => {
              const days = rxDaysUntil(rx.repeat_prescription_date, dayStr);
              const isOrdered = orderedRx.has(
                `${rx.id}_${rx.repeat_prescription_date}`
              );
              return (
                <div
                  key={rx.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: isOrdered ? "#DCFCE7" : "#FEF3C7" }}
                >
                  <RotateCcw
                    size={14}
                    style={{ color: isOrdered ? "#16A34A" : "#D97706" }}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warmstone-900">
                      {rx.name}
                    </p>
                    <p
                      className="text-xs font-medium"
                      style={{ color: isOrdered ? "#16A34A" : "#D97706" }}
                    >
                      {isOrdered
                        ? "Marked as ordered"
                        : days === 0
                        ? "Due today"
                        : `Due in ${days} day${days > 1 ? "s" : ""}`}
                    </p>
                    {showPersonFilters && (
                      <p className="text-xs text-warmstone-400 mt-0.5">
                        {personName(rx.person_id)}
                      </p>
                    )}
                  </div>
                  {!isOrdered && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          onMarkOrdered(rx.id, rx.repeat_prescription_date)
                        }
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white min-h-[32px]"
                        style={{ backgroundColor: "#5B8A72" }}
                      >
                        <Check size={11} />
                        Ordered
                      </button>
                      <button
                        onClick={() =>
                          onDismissRx(rx.id, rx.repeat_prescription_date)
                        }
                        className="p-1.5 rounded-lg text-warmstone-400 hover:text-warmstone-700 hover:bg-warmstone-100 transition-colors min-h-[32px]"
                        aria-label="Dismiss"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Benefit reviews */}
        {entitlementReviews.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-warmstone-500 uppercase tracking-wide">
              Benefit Reviews
            </h3>
            {entitlementReviews.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 bg-info-light border border-info/20 rounded-xl px-3 py-2.5"
              >
                <FileText size={14} className="text-info shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-info">{r.benefit_name}</p>
                  <p className="text-xs text-info/70">Review due today</p>
                  {showPersonFilters && (
                    <p className="text-xs text-info/60 mt-0.5">
                      {personName(r.person_id)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View full day */}
        <div className="border-t border-warmstone-100 pt-4">
          <button
            onClick={() => {
              onClose();
              onViewDay(date);
            }}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors min-h-[44px]"
            style={{ backgroundColor: "#E8A817" }}
          >
            <CalendarDays size={16} />
            View full day
          </button>
        </div>
      </div>
    </Modal>
  );
}
