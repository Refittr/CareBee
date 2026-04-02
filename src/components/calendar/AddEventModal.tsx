"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { CalendarEvent } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDate: string; // 'YYYY-MM-DD'
  householdId: string;
  onCreated: (event: CalendarEvent) => void;
}

const CATEGORIES = [
  { value: "appointment", label: "Appointment" },
  { value: "task", label: "Task" },
  { value: "reminder", label: "Reminder" },
  { value: "other", label: "Other" },
];

export function AddEventModal({ open, onClose, defaultDate, householdId, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("other");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setTitle("");
      setDate(defaultDate);
      setTime("");
      setCategory("other");
      setNotes("");
      setError(null);
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, defaultDate]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_id: householdId,
          title: title.trim(),
          event_date: date,
          event_time: time || null,
          notes: notes.trim() || null,
          category,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Could not save event.");
      }

      const created = await res.json() as CalendarEvent;
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event.");
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — slides up from bottom on mobile, centred on desktop */}
      <div
        className="fixed z-50 bg-warmstone-white shadow-2xl w-full md:max-w-md md:rounded-2xl"
        style={{
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          borderRadius: "1rem 1rem 0 0",
          maxWidth: "100vw",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Add event"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-warmstone-100">
          <h2 className="text-base font-bold text-warmstone-900">Add event</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-warmstone-400 hover:text-warmstone-700 hover:bg-warmstone-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-warmstone-700 uppercase tracking-wide">
              Title <span className="text-error">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. District nurse visit"
              required
              className="w-full rounded-xl border border-warmstone-200 bg-warmstone-50 px-3 py-2.5 text-sm text-warmstone-900 placeholder-warmstone-300 focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": "#E8A817" } as React.CSSProperties}
            />
          </div>

          {/* Date + Time row */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-warmstone-700 uppercase tracking-wide">
                Date <span className="text-error">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-warmstone-200 bg-warmstone-50 px-3 py-2.5 text-sm text-warmstone-900 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#E8A817" } as React.CSSProperties}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-warmstone-700 uppercase tracking-wide">
                Time <span className="text-warmstone-300 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-warmstone-200 bg-warmstone-50 px-3 py-2.5 text-sm text-warmstone-900 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#E8A817" } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-warmstone-700 uppercase tracking-wide">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-warmstone-200 bg-warmstone-50 px-3 py-2.5 text-sm text-warmstone-900 focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ "--tw-ring-color": "#E8A817" } as React.CSSProperties}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-warmstone-700 uppercase tracking-wide">
              Notes <span className="text-warmstone-300 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              className="w-full rounded-xl border border-warmstone-200 bg-warmstone-50 px-3 py-2.5 text-sm text-warmstone-900 placeholder-warmstone-300 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style={{ "--tw-ring-color": "#E8A817" } as React.CSSProperties}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-error font-semibold">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-warmstone-600 bg-warmstone-100 hover:bg-warmstone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#E8A817" }}
            >
              {saving ? "Saving..." : "Save event"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
