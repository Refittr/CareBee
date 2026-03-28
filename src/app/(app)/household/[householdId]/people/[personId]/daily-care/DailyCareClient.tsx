"use client";

import { useState, useCallback } from "react";
import { Plus, Download, ClipboardList, EyeOff } from "lucide-react";
import type { DailyCareRecord } from "@/lib/types/database";
import { DailyCareCard } from "./DailyCareCard";
import { DailyCareForm } from "./DailyCareForm";
import { HelpPopout } from "./HelpPopout";

interface Props {
  person: { id: string; first_name: string; last_name: string; daily_care_enabled: boolean };
  householdId: string;
  initialRecords: DailyCareRecord[];
  initialTotal: number;
  readOnly?: boolean;
  initialOpenFlags?: DailyCareRecord[];
}

const PER_PAGE = 20;

export function DailyCareClient({ person, householdId, initialRecords, initialTotal, readOnly = false, initialOpenFlags = [] }: Props) {
  const [records, setRecords] = useState<DailyCareRecord[]>(initialRecords);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");
  const [activeShift, setActiveShift] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyCareRecord | null>(null);
  const [openFlags, setOpenFlags] = useState<DailyCareRecord[]>(initialOpenFlags);

  const baseUrl = `/api/households/${householdId}/people/${person.id}/daily-care`;

  const loadPage = useCallback(async (p: number, from: string, to: string, shift: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), perPage: String(PER_PAGE) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (shift) params.set("shift", shift);
    const res = await fetch(`${baseUrl}?${params}`);
    const data = await res.json();
    setRecords(data.records ?? []);
    setTotal(data.total ?? 0);
    setPage(p);
    setLoading(false);
  }, [baseUrl]);

  function applyFilters() {
    setActiveFrom(fromDate);
    setActiveTo(toDate);
    setActiveShift(shiftFilter);
    loadPage(1, fromDate, toDate, shiftFilter);
  }

  async function handleExport() {
    const params = new URLSearchParams();
    if (activeFrom) params.set("from", activeFrom);
    if (activeTo) params.set("to", activeTo);
    if (activeShift) params.set("shift", activeShift);
    const res = await fetch(`${baseUrl}/export?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-care-${person.first_name}-${person.last_name}.csv`.toLowerCase().replace(/\s/g, "-");
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDeleted(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => t - 1);
  }

  function handleSaved(record: DailyCareRecord, isEdit: boolean) {
    if (isEdit) {
      setRecords((prev) => prev.map((r) => r.id === record.id ? record : r));
    } else {
      setRecords((prev) => [record, ...prev]);
      setTotal((t) => t + 1);
    }
    setShowForm(false);
    setEditingRecord(null);
  }

  function handleFlagDismissed(id: string) {
    setOpenFlags((prev) => prev.filter((f) => f.id !== id));
    // Also update the record in the list if it's visible
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, follow_up_resolved: true } : r));
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-warmstone-900">Daily care records</h1>
          <HelpPopout />
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors"
          >
            <Plus size={14} /> Add record
          </button>
        )}
      </div>

      {/* Read-only notice */}
      {readOnly && (
        <div className="flex items-center gap-2 mb-5 px-4 py-3 bg-warmstone-50 border border-warmstone-200 rounded-lg text-sm text-warmstone-600">
          <EyeOff size={15} className="shrink-0 text-warmstone-400" />
          Daily care is turned off. Records are read-only. Turn it back on in the person&apos;s settings to add new records.
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-700"
        />
        <span className="text-warmstone-400 text-sm">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-700"
        />
        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-warmstone-200 rounded-md bg-warmstone-white text-warmstone-700"
        >
          <option value="">All shifts</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
          <option value="night">Night</option>
          <option value="full_day">Full day</option>
        </select>
        <button
          onClick={applyFilters}
          className="px-4 py-2 text-sm font-bold bg-honey-400 text-warmstone-white rounded-md hover:bg-honey-600 transition-colors"
        >
          Filter
        </button>
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-warmstone-600 border border-warmstone-200 rounded-md hover:bg-warmstone-50 transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Records */}
      <div className={`flex flex-col gap-3 ${loading ? "opacity-60 pointer-events-none" : ""}`}>
        {records.length === 0 ? (
          <div className="text-center py-12 text-warmstone-400">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-warmstone-600">No daily care records yet</p>
            <p className="text-sm mt-1">
              Add the first one to start building a picture of {person.first_name}&apos;s day-to-day wellbeing.
            </p>
          </div>
        ) : (
          records.map((record) => (
            <DailyCareCard
              key={record.id}
              record={record}
              householdId={householdId}
              personId={person.id}
              readOnly={readOnly}
              onEdit={() => setEditingRecord(record)}
              onDeleted={() => handleDeleted(record.id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-warmstone-100">
          <p className="text-sm text-warmstone-500">
            Showing {records.length} of {total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPage(page - 1, activeFrom, activeTo, activeShift)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 text-sm border border-warmstone-200 rounded-md hover:bg-warmstone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-warmstone-500">{page} / {totalPages}</span>
            <button
              onClick={() => loadPage(page + 1, activeFrom, activeTo, activeShift)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 text-sm border border-warmstone-200 rounded-md hover:bg-warmstone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add / edit form */}
      {(showForm || editingRecord) && (
        <DailyCareForm
          householdId={householdId}
          personId={person.id}
          personName={`${person.first_name} ${person.last_name}`}
          record={editingRecord ?? undefined}
          openFlags={editingRecord ? [] : openFlags}
          onFlagDismissed={handleFlagDismissed}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingRecord(null); }}
        />
      )}
    </div>
  );
}
