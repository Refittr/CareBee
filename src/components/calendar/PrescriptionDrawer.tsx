"use client";

import { useEffect } from "react";
import { X, Bell, RotateCcw } from "lucide-react";
import type { CalendarRepeatPrescription } from "./types";

function rxDaysUntil(rxDate: string, dayStr: string): number {
  const due = new Date(rxDate + "T00:00:00").getTime();
  const day = new Date(dayStr + "T00:00:00").getTime();
  const diff = Math.round((due - day) / 86400000);
  return diff >= 0 && diff <= 3 ? diff : -1;
}

interface Props {
  open: boolean;
  onClose: () => void;
  prescriptions: CalendarRepeatPrescription[];
  todayStr: string;
  orderedRx: Set<string>;
  dismissedRx: Set<string>;
  markOrdered: (medId: string, rxDate: string) => void;
  dismissRx: (medId: string, rxDate: string) => void;
  showPersonFilters: boolean;
  personName: (id: string) => string;
}

export function PrescriptionDrawer({
  open,
  onClose,
  prescriptions,
  todayStr,
  orderedRx,
  dismissedRx,
  markOrdered,
  dismissRx,
  showPersonFilters,
  personName,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // All rx in the reminder window, not dismissed
  const active = prescriptions.filter(
    (rx) =>
      rxDaysUntil(rx.repeat_prescription_date, todayStr) >= 0 &&
      !dismissedRx.has(`${rx.id}_${rx.repeat_prescription_date}`)
  );

  const unresolved = active.filter(
    (rx) => !orderedRx.has(`${rx.id}_${rx.repeat_prescription_date}`)
  );
  const orderedList = active.filter((rx) =>
    orderedRx.has(`${rx.id}_${rx.repeat_prescription_date}`)
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Prescription Alerts"
        className={[
          "fixed top-0 right-0 z-50 h-full w-full sm:w-96 flex flex-col shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        style={{ backgroundColor: "#FAFAF8" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "#EDE8E2" }}
        >
          <div className="flex items-center gap-2.5">
            <Bell size={18} style={{ color: "#E8A817" }} />
            <h2 className="text-base font-bold text-warmstone-900">
              Prescription Alerts
            </h2>
            {unresolved.length > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}
              >
                {unresolved.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-warmstone-400 hover:text-warmstone-700 hover:bg-warmstone-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#EEF5F1" }}
              >
                <Bell size={24} className="text-sage-400" />
              </div>
              <p className="text-sm font-bold text-warmstone-700">
                All caught up
              </p>
              <p className="text-xs text-warmstone-400">
                No upcoming prescription reminders right now.
              </p>
            </div>
          ) : (
            <>
              {/* Unresolved reminders */}
              {unresolved.map((rx) => {
                const days = rxDaysUntil(rx.repeat_prescription_date, todayStr);
                const urgent = days <= 1;
                return (
                  <div
                    key={rx.id}
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: "#FEF3C7",
                      border: `1px solid ${urgent ? "#FCA5A5" : "#FDE68A"}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-bold" style={{ color: "#92400E" }}>
                        {rx.name}
                      </p>
                      {urgent && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                        >
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs mb-1" style={{ color: "#D97706" }}>
                      {days === 0
                        ? "Due today - time to reorder"
                        : `Due in ${days} day${days > 1 ? "s" : ""}`}
                    </p>
                    {showPersonFilters && (
                      <p className="text-xs mb-3" style={{ color: "#B45309" }}>
                        {personName(rx.person_id)}
                      </p>
                    )}
                    {!showPersonFilters && <div className="mb-3" />}
                    <div className="flex gap-2">
                      <button
                        onClick={() => markOrdered(rx.id, rx.repeat_prescription_date)}
                        className="flex-1 text-xs font-semibold py-2 rounded-lg transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "#FDE68A", color: "#78350F" }}
                      >
                        Ordered
                      </button>
                      <button
                        onClick={() => dismissRx(rx.id, rx.repeat_prescription_date)}
                        className="flex-1 text-xs font-semibold py-2 rounded-lg transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: "#FEF3C7",
                          color: "#B45309",
                          border: "1px solid #FDE68A",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Ordered section */}
              {orderedList.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-warmstone-400 pt-1">
                    Ordered
                  </p>
                  {orderedList.map((rx) => (
                    <div
                      key={rx.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{
                        backgroundColor: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                      }}
                    >
                      <RotateCcw size={13} className="text-sage-500 shrink-0" />
                      <span className="text-xs font-semibold text-sage-700 flex-1 min-w-0 truncate">
                        {rx.name} - ordered
                      </span>
                      {showPersonFilters && (
                        <span className="text-xs text-sage-500 shrink-0">
                          {personName(rx.person_id)}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
