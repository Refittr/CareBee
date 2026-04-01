"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCalendarData } from "./useCalendarData";
import type { CalendarData, CalendarTakenEntry } from "./types";
import { YearView } from "./views/YearView";
import { MonthView } from "./views/MonthView";
import { WeekView } from "./views/WeekView";
import { DayView } from "./views/DayView";

export type CalendarView = "day" | "week" | "month" | "year";

export const PERSON_COLORS = [
  "#E8A817", "#5B8A72", "#4A7FB5", "#9B59B6", "#E74C3C",
];

export function getWeekMonday(d: Date): Date {
  const day = d.getDay();
  const offset = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTitle(view: CalendarView, cursor: Date): string {
  if (view === "year") return String(cursor.getFullYear());
  if (view === "month") {
    return cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }
  if (view === "week") {
    const monday = getWeekMonday(cursor);
    const sunday = addDays(monday, 6);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    if (monday.getFullYear() !== sunday.getFullYear()) {
      return `${monday.toLocaleDateString("en-GB", { ...opts, year: "numeric" })} – ${sunday.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
    }
    if (monday.getMonth() !== sunday.getMonth()) {
      return `${monday.toLocaleDateString("en-GB", opts)} – ${sunday.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
    }
    return `${monday.getDate()}–${sunday.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
  }
  // day
  return cursor.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function navigateCursor(view: CalendarView, cursor: Date, dir: -1 | 1): Date {
  const d = new Date(cursor);
  if (view === "day") d.setDate(d.getDate() + dir);
  else if (view === "week") d.setDate(d.getDate() + 7 * dir);
  else if (view === "month") d.setMonth(d.getMonth() + dir);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

function mergeUnique<T extends { id: string }>(a: T[], b: T[]): T[] {
  const seen = new Set(a.map((x) => x.id));
  return [...a, ...b.filter((x) => !seen.has(x.id))];
}

function mergeTakenLog(
  a: CalendarTakenEntry[],
  b: CalendarTakenEntry[]
): CalendarTakenEntry[] {
  const key = (e: CalendarTakenEntry) =>
    `${e.medication_id}|${e.schedule_id ?? ""}|${e.taken_date}`;
  const seen = new Set(a.map(key));
  return [...a, ...b.filter((e) => !seen.has(key(e)))];
}

interface Props {
  householdId: string;
}

export function CalendarPageClient({ householdId }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<Date>(today);
  const [hiddenPersonIds, setHiddenPersonIds] = useState<Set<string>>(new Set());
  const [focusIso, setFocusIso] = useState<string | null>(null);

  const weekMonday = useMemo(() => getWeekMonday(cursor), [cursor]);
  const weekSunday = useMemo(() => addDays(weekMonday, 6), [weekMonday]);

  // Primary month: cursor's month, or week-Monday's month in week view
  const primaryYear =
    view === "week" ? weekMonday.getFullYear() : cursor.getFullYear();
  const primaryMonth =
    view === "week" ? weekMonday.getMonth() + 1 : cursor.getMonth() + 1;

  // Secondary month: only relevant when a week spans two calendar months
  const secondaryYear = weekSunday.getFullYear();
  const secondaryMonth = weekSunday.getMonth() + 1;
  const needsSecondMonth =
    view === "week" &&
    (secondaryYear !== primaryYear || secondaryMonth !== primaryMonth);

  const {
    data: data1,
    takenLog: takenLog1,
    loading,
    error,
    toggleTaken,
  } = useCalendarData(householdId, primaryYear, primaryMonth);

  // Always call this hook (Rules of Hooks); when not needed it fetches the same URL as data1
  const { data: data2, takenLog: takenLog2 } = useCalendarData(
    householdId,
    needsSecondMonth ? secondaryYear : primaryYear,
    needsSecondMonth ? secondaryMonth : primaryMonth
  );

  const mergedData = useMemo((): CalendarData | null => {
    if (!data1) return null;
    if (!needsSecondMonth || !data2) return data1;
    return {
      people: data1.people,
      appointments: mergeUnique(data1.appointments, data2.appointments),
      medications: mergeUnique(data1.medications, data2.medications),
      taken_log: mergeTakenLog(data1.taken_log, data2.taken_log),
      entitlement_reviews: mergeUnique(
        data1.entitlement_reviews,
        data2.entitlement_reviews
      ),
      repeat_prescriptions: mergeUnique(
        data1.repeat_prescriptions,
        data2.repeat_prescriptions
      ),
    };
  }, [data1, data2, needsSecondMonth]);

  const takenLog = useMemo(() => {
    if (!needsSecondMonth) return takenLog1;
    return mergeTakenLog(takenLog1, takenLog2);
  }, [takenLog1, takenLog2, needsSecondMonth]);

  const personColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    (data1?.people ?? []).forEach((p, i) => {
      map[p.id] = PERSON_COLORS[i % PERSON_COLORS.length];
    });
    return map;
  }, [data1]);

  const showPersonFilters = (data1?.people.length ?? 0) > 1;

  function togglePerson(id: string) {
    setHiddenPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function drillDown(date: Date, targetView: CalendarView) {
    setCursor(date);
    setView(targetView);
  }

  function handleAppointmentDayView(date: Date, apptIso: string) {
    setFocusIso(apptIso);
    drillDown(date, "day");
  }

  const title = formatTitle(view, cursor);
  const views: CalendarView[] = ["day", "week", "month", "year"];

  return (
    <div className="flex flex-col gap-6">
      {/* Header — navigation + title + view switcher all in one row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Prev / Today / Next */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCursor((c) => navigateCursor(view, c, -1))}
            className="p-2 text-warmstone-500 hover:text-warmstone-900 hover:bg-warmstone-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCursor(today)}
            className="px-3 py-1.5 text-sm font-semibold text-warmstone-600 hover:text-warmstone-900 hover:bg-warmstone-100 rounded-lg transition-colors min-h-[36px]"
          >
            Today
          </button>
          <button
            onClick={() => setCursor((c) => navigateCursor(view, c, 1))}
            className="p-2 text-warmstone-500 hover:text-warmstone-900 hover:bg-warmstone-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Title */}
        <h1 className="font-display text-xl text-warmstone-900 min-w-[140px] capitalize">
          {title}
        </h1>

        {/* Divider */}
        <div className="w-px h-6 bg-warmstone-200 mx-1 hidden sm:block" />

        {/* View switcher — pill tabs */}
        <div className="flex items-center gap-1 bg-warmstone-100 rounded-xl p-1">
          {views.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                "px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all",
                v === view
                  ? "bg-warmstone-white text-warmstone-900 shadow-sm"
                  : "text-warmstone-500 hover:text-warmstone-800",
              ].join(" ")}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Person filters (carer mode) */}
      {showPersonFilters && data1 && (
        <div className="flex flex-wrap gap-2">
          {data1.people.map((person, idx) => {
            const color = PERSON_COLORS[idx % PERSON_COLORS.length];
            const hidden = hiddenPersonIds.has(person.id);
            return (
              <button
                key={person.id}
                onClick={() => togglePerson(person.id)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors",
                  hidden
                    ? "border-warmstone-200 text-warmstone-400 bg-warmstone-50"
                    : "border-warmstone-200 text-warmstone-800 bg-warmstone-white",
                ].join(" ")}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: hidden ? "#DED8D1" : color }}
                />
                {person.first_name} {person.last_name}
              </button>
            );
          })}
        </div>
      )}

      {/* View content */}
      {view === "year" ? (
        <YearView
          householdId={householdId}
          year={cursor.getFullYear()}
          hiddenPersonIds={hiddenPersonIds}
          personColorMap={personColorMap}
          today={today}
          onNavigate={drillDown}
        />
      ) : loading ? (
        <div className="h-64 flex items-center justify-center text-sm text-warmstone-400">
          Loading...
        </div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center text-sm text-error">
          {error}
        </div>
      ) : view === "month" ? (
        <MonthView
          data={mergedData}
          takenLog={takenLog}
          year={primaryYear}
          month={primaryMonth}
          hiddenPersonIds={hiddenPersonIds}
          personColorMap={personColorMap}
          showPersonFilters={showPersonFilters}
          today={today}
          onDayClick={(date) => drillDown(date, "day")}
          onAppointmentDayView={handleAppointmentDayView}
          onTakenToggle={toggleTaken}
        />
      ) : view === "week" ? (
        <WeekView
          data={mergedData}
          takenLog={takenLog}
          weekMonday={weekMonday}
          hiddenPersonIds={hiddenPersonIds}
          personColorMap={personColorMap}
          showPersonFilters={showPersonFilters}
          today={today}
          onDayClick={(date) => drillDown(date, "day")}
          onTakenToggle={toggleTaken}
        />
      ) : (
        <DayView
          data={mergedData}
          takenLog={takenLog}
          date={cursor}
          hiddenPersonIds={hiddenPersonIds}
          personColorMap={personColorMap}
          showPersonFilters={showPersonFilters}
          today={today}
          focusIso={focusIso}
          onTakenToggle={toggleTaken}
        />
      )}
    </div>
  );
}
