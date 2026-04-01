"use client";

import { Pill, Calendar, FileText, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type {
  CalendarAppointment,
  CalendarMedication,
  CalendarEntitlementReview,
  CalendarRepeatPrescription,
  CalendarPerson,
  CalendarTakenEntry,
} from "./types";
import { getMedTakenStatus } from "./useCalendarData";

interface DayDetailPanelProps {
  date: string; // YYYY-MM-DD
  appointments: CalendarAppointment[];
  medications: CalendarMedication[];
  entitlementReviews: CalendarEntitlementReview[];
  repeatPrescriptions: CalendarRepeatPrescription[];
  takenLog: CalendarTakenEntry[];
  people: CalendarPerson[];
  onClose: () => void;
  onTakenToggle: (medId: string, scheduleId: string | null, date: string, newValue: boolean) => void;
}

function personName(people: CalendarPerson[], personId: string): string {
  const p = people.find((p) => p.id === personId);
  return p ? `${p.first_name} ${p.last_name}` : "";
}

function formatApptTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function displayTime(time: string): string {
  return time.slice(0, 5);
}

const statusLabels: Record<string, string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  missed: "Missed",
};

const statusColors: Record<string, string> = {
  upcoming: "text-info bg-info-light",
  completed: "text-sage-700 bg-sage-50",
  cancelled: "text-warmstone-500 bg-warmstone-100",
  missed: "text-error bg-error-light",
};

export function DayDetailPanel({
  date,
  appointments,
  medications,
  entitlementReviews,
  repeatPrescriptions,
  takenLog,
  people,
  onClose,
  onTakenToggle,
}: DayDetailPanelProps) {
  const showPeopleNames = people.length > 1;
  const hasContent =
    appointments.length > 0 ||
    medications.length > 0 ||
    entitlementReviews.length > 0 ||
    repeatPrescriptions.length > 0;

  return (
    <Modal open onClose={onClose} title={formatDisplayDate(date)} maxWidth="md">
      {!hasContent ? (
        <p className="text-sm text-warmstone-500 py-4 text-center">Nothing scheduled for this day.</p>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Appointments */}
          {appointments.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={15} className="text-honey-600 shrink-0" />
                <h3 className="text-sm font-bold text-warmstone-900">Appointments</h3>
              </div>
              <div className="flex flex-col gap-3">
                {appointments.map((appt) => (
                  <div key={appt.id} className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-warmstone-500 w-12 shrink-0 pt-0.5">
                      {formatApptTime(appt.appointment_date)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warmstone-900 leading-snug">{appt.title}</p>
                      {appt.location && <p className="text-xs text-warmstone-500">{appt.location}</p>}
                      {appt.professional_name && <p className="text-xs text-warmstone-500">{appt.professional_name}</p>}
                      {showPeopleNames && (
                        <p className="text-xs text-warmstone-400 mt-0.5">{personName(people, appt.person_id)}</p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColors[appt.status] ?? "text-warmstone-500 bg-warmstone-100"}`}>
                      {statusLabels[appt.status] ?? appt.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Medications */}
          {medications.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Pill size={15} className="text-sage-500 shrink-0" />
                <h3 className="text-sm font-bold text-warmstone-900">Medications</h3>
              </div>
              <div className="flex flex-col gap-4">
                {medications.map((med) => {
                  const isTakenAll =
                    getMedTakenStatus(med.id, med.schedule_type, med.schedules.length, date, takenLog) === "all";

                  return (
                    <div key={med.id}>
                      <div className="flex items-start gap-2 mb-2">
                        <Pill size={14} className="text-sage-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-warmstone-900 leading-snug">{med.name}</p>
                          {med.dosage && <p className="text-xs text-warmstone-600">{med.dosage}</p>}
                          {med.purpose && <p className="text-xs text-warmstone-500">For: {med.purpose}</p>}
                          {showPeopleNames && (
                            <p className="text-xs text-warmstone-400">{personName(people, med.person_id)}</p>
                          )}
                        </div>
                      </div>

                      {med.schedule_type === "specific_times" ? (
                        <div className="flex flex-col gap-1.5 ml-6">
                          {med.schedules.map((slot) => {
                            const log = takenLog.find(
                              (l) => l.medication_id === med.id && l.schedule_id === slot.id && l.taken_date === date
                            );
                            const checked = log?.taken ?? false;
                            return (
                              <label key={slot.id} className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                                <span className="text-xs font-semibold text-warmstone-500 w-12 shrink-0">
                                  {displayTime(slot.time)}
                                </span>
                                <span className="text-xs text-warmstone-700 flex-1">{med.name}{med.dosage ? ` ${med.dosage}` : ""}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => onTakenToggle(med.id, slot.id, date, e.target.checked)}
                                  className="w-4 h-4 accent-sage-400 shrink-0"
                                />
                                <span className="text-xs text-warmstone-500 shrink-0 w-12">
                                  {checked ? "Taken" : "Not taken"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 ml-6 cursor-pointer min-h-[36px]">
                          <span className="text-xs text-warmstone-600 flex-1">
                            ({med.times_per_day ?? 1} {med.times_per_day === 1 ? "time" : "times"} daily)
                          </span>
                          <input
                            type="checkbox"
                            checked={
                              takenLog.find(
                                (l) => l.medication_id === med.id && l.schedule_id === null && l.taken_date === date
                              )?.taken ?? false
                            }
                            onChange={(e) => onTakenToggle(med.id, null, date, e.target.checked)}
                            className="w-4 h-4 accent-sage-400 shrink-0"
                          />
                          <span className="text-xs text-warmstone-500 shrink-0 w-12">
                            {isTakenAll ? "Taken" : "Not taken"}
                          </span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Entitlement reviews */}
          {entitlementReviews.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className="text-info shrink-0" />
                <h3 className="text-sm font-bold text-warmstone-900">Benefit reviews due</h3>
              </div>
              <div className="flex flex-col gap-2">
                {entitlementReviews.map((r) => (
                  <div key={r.id} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warmstone-800">{r.benefit_name}</p>
                      <p className="text-xs text-warmstone-500">Review date due today</p>
                      {showPeopleNames && (
                        <p className="text-xs text-warmstone-400">{personName(people, r.person_id)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Repeat prescriptions */}
          {repeatPrescriptions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw size={15} className="text-warmstone-500 shrink-0" />
                <h3 className="text-sm font-bold text-warmstone-900">Repeat prescriptions due</h3>
              </div>
              <div className="flex flex-col gap-2">
                {repeatPrescriptions.map((rx) => (
                  <div key={rx.id} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warmstone-800">{rx.name}</p>
                      <p className="text-xs text-warmstone-500">Time to reorder this prescription</p>
                      {showPeopleNames && (
                        <p className="text-xs text-warmstone-400">{personName(people, rx.person_id)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </Modal>
  );
}
