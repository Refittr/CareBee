"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ExternalLink, MessageSquare, FileText, RefreshCw,
  ChevronDown, ChevronUp, Check, X, Bookmark, SkipForward,
} from "lucide-react";
import type { RedditHit } from "./page";
import Link from "next/link";

interface Props {
  initialHits: RedditHit[];
  allSubreddits: { id: string; name: string; is_active: boolean }[];
  categories: string[];
}

const STATUS_BADGE: Record<string, string> = {
  new: "bg-amber-100 text-amber-700 border border-amber-200",
  replied: "bg-sage-50 text-sage-700 border border-sage-200",
  skipped: "bg-warmstone-100 text-warmstone-500 border border-warmstone-200",
  saved: "bg-blue-50 text-blue-700 border border-blue-200",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function highlightKeyword(text: string, keyword: string): React.ReactNode {
  if (!keyword) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-100 text-amber-800 rounded px-0.5">{text.slice(idx, idx + keyword.length)}</mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}

function HitCard({
  hit,
  onUpdate,
}: {
  hit: RedditHit;
  onUpdate: (id: string, updates: Partial<RedditHit>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(hit.notes ?? "");
  const [saving, setSaving] = useState(false);

  const snippet = hit.body.slice(0, 200);
  const hasMore = hit.body.length > 200;

  async function updateStatus(status: string) {
    onUpdate(hit.id, { status });
    await fetch("/api/admin/reddit/hits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: hit.id, status }),
    });
  }

  async function saveNotes() {
    setSaving(true);
    onUpdate(hit.id, { notes });
    await fetch("/api/admin/reddit/hits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: hit.id, notes }),
    });
    setSaving(false);
    setNotesOpen(false);
  }

  return (
    <div className={`bg-warmstone-white border rounded-lg overflow-hidden transition-all ${hit.status === "skipped" ? "opacity-60" : ""} border-warmstone-200`}>
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-2 flex-wrap mb-2">
          <span className="text-xs font-semibold text-warmstone-600 bg-warmstone-100 border border-warmstone-200 rounded-full px-2 py-0.5">
            r/{hit.subreddit}
          </span>
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 flex items-center gap-1 ${hit.type === "post" ? "bg-honey-50 text-honey-700 border border-honey-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
            {hit.type === "post" ? <FileText size={10} /> : <MessageSquare size={10} />}
            {hit.type}
          </span>
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ml-auto ${STATUS_BADGE[hit.status] ?? STATUS_BADGE.new}`}>
            {hit.status}
          </span>
        </div>

        {/* Title */}
        {hit.title && (
          <p className="text-sm font-bold text-warmstone-900 mb-1.5 leading-snug">{hit.title}</p>
        )}

        {/* Body */}
        <p className="text-sm text-warmstone-700 leading-relaxed mb-2">
          {highlightKeyword(expanded ? hit.body : snippet, hit.matched_keyword)}
          {!expanded && hasMore && (
            <button
              onClick={() => setExpanded(true)}
              className="text-honey-600 font-semibold ml-1 hover:underline"
            >
              more
            </button>
          )}
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="text-warmstone-400 font-semibold ml-1 hover:underline"
            >
              less
            </button>
          )}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-warmstone-400 mb-3 flex-wrap">
          <span>u/{hit.author}</span>
          <span>{timeAgo(hit.found_at)}</span>
          <span className="bg-warmstone-50 border border-warmstone-200 rounded px-1.5 py-0.5 text-warmstone-600 font-medium">
            {hit.matched_keyword}
          </span>
        </div>

        {/* Notes (collapsed) */}
        {hit.notes && !notesOpen && (
          <p className="text-xs text-warmstone-500 bg-warmstone-50 rounded-lg px-3 py-2 mb-3 italic">
            {hit.notes}
          </p>
        )}

        {/* Notes textarea */}
        {notesOpen && (
          <div className="mb-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full text-sm border border-warmstone-200 rounded-lg px-3 py-2 text-warmstone-800 bg-warmstone-50 focus:outline-none focus:ring-2 resize-none"
              style={{ "--tw-ring-color": "#d4a853" } as React.CSSProperties}
            />
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={saveNotes}
                disabled={saving}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: "#d4a853" }}
              >
                {saving ? "Saving..." : "Save note"}
              </button>
              <button
                onClick={() => { setNotesOpen(false); setNotes(hit.notes ?? ""); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-warmstone-500 hover:bg-warmstone-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={hit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ backgroundColor: "#FF4500" }}
          >
            <ExternalLink size={12} />
            Open on Reddit
          </a>

          {hit.status !== "replied" && (
            <button
              onClick={() => updateStatus("replied")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sage-50 text-sage-700 border border-sage-200 hover:bg-sage-100 transition-colors"
            >
              <Check size={12} />
              Replied
            </button>
          )}
          {hit.status !== "saved" && (
            <button
              onClick={() => updateStatus("saved")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Bookmark size={12} />
              Save
            </button>
          )}
          {hit.status !== "skipped" && (
            <button
              onClick={() => updateStatus("skipped")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-warmstone-50 text-warmstone-500 border border-warmstone-200 hover:bg-warmstone-100 transition-colors"
            >
              <SkipForward size={12} />
              Skip
            </button>
          )}
          {hit.status !== "new" && (
            <button
              onClick={() => updateStatus("new")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-warmstone-50 text-warmstone-400 border border-warmstone-200 hover:bg-warmstone-100 transition-colors"
            >
              <X size={12} />
              Reset
            </button>
          )}
          <button
            onClick={() => { setNotesOpen((v) => !v); if (!notesOpen) setNotes(hit.notes ?? ""); }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-warmstone-50 text-warmstone-600 border border-warmstone-200 hover:bg-warmstone-100 transition-colors ml-auto"
          >
            {notesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Notes
          </button>
        </div>
      </div>
    </div>
  );
}

export function RedditHitsClient({ initialHits, allSubreddits, categories }: Props) {
  const [hits, setHits] = useState<RedditHit[]>(initialHits);
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [subredditFilter, setSubredditFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);
  const [activeBatch, setActiveBatch] = useState<number | null>(null);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { new: 0, replied: 0, skipped: 0, saved: 0 };
    for (const h of hits) counts[h.status] = (counts[h.status] ?? 0) + 1;
    return counts;
  }, [hits]);

  const filtered = useMemo(() => {
    return hits.filter((h) => {
      if (statusFilter !== "all" && h.status !== statusFilter) return false;
      if (subredditFilter !== "all" && h.subreddit !== subredditFilter) return false;
      return true;
    });
  }, [hits, statusFilter, subredditFilter, categoryFilter]);

  const updateHit = useCallback((id: string, updates: Partial<RedditHit>) => {
    setHits((prev) => prev.map((h) => h.id === id ? { ...h, ...updates } : h));
  }, []);

  async function triggerScrape(batch: number) {
    setScraping(true);
    setActiveBatch(batch);
    setScrapeMsg(`Running batch ${batch}...`);
    try {
      const res = await fetch("/api/admin/reddit/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      setScrapeMsg(res.ok ? `Batch ${batch} complete.` : `Error: ${data.error?.slice(0, 120) ?? "unknown"}`);
    } catch (e) {
      setScrapeMsg(`Failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setScraping(false);
      setActiveBatch(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-warmstone-900">Reddit Monitor</h1>
          <p className="text-sm text-warmstone-500 mt-0.5">{hits.length} total hits</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/reddit/keywords"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-warmstone-100 text-warmstone-600 hover:bg-warmstone-200 transition-colors border border-warmstone-200"
          >
            Keywords
          </Link>
          <Link
            href="/admin/reddit/subreddits"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-warmstone-100 text-warmstone-600 hover:bg-warmstone-200 transition-colors border border-warmstone-200"
          >
            Subreddits
          </Link>
          {/* Scraper trigger — 11 batches (8 keywords each) */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, i) => i + 1).map((b) => {
              const isActive = activeBatch === b;
              return (
                <button
                  key={b}
                  onClick={() => triggerScrape(b)}
                  disabled={scraping}
                  className="flex items-center justify-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg disabled:opacity-40 transition-all"
                  style={{
                    backgroundColor: isActive ? "#b8892f" : "#d4a853",
                    color: "#faf7f2",
                    outline: isActive ? "2px solid #d4a853" : "none",
                    outlineOffset: "2px",
                    animation: isActive ? "pulse 1s cubic-bezier(0.4,0,0.6,1) infinite" : "none",
                  }}
                >
                  <RefreshCw size={10} className={isActive ? "animate-spin" : ""} />
                  B{b}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {scrapeMsg && (
        <div className="bg-warmstone-50 border border-warmstone-200 rounded-lg px-4 py-2.5 text-sm text-warmstone-700 flex items-center justify-between">
          {scrapeMsg}
          <button onClick={() => setScrapeMsg(null)} className="text-warmstone-400 hover:text-warmstone-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["new", "replied", "skipped", "saved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}
            className={`rounded-lg p-3 text-left border transition-all ${statusFilter === s ? "ring-2 ring-offset-1" : ""} ${
              s === "new" ? "bg-amber-50 border-amber-200" :
              s === "replied" ? "bg-sage-50 border-sage-200" :
              s === "skipped" ? "bg-warmstone-50 border-warmstone-200" :
              "bg-blue-50 border-blue-200"
            }`}
            style={statusFilter === s ? { "--tw-ring-color": "#d4a853" } as React.CSSProperties : {}}
          >
            <p className={`text-2xl font-bold ${
              s === "new" ? "text-amber-700" :
              s === "replied" ? "text-sage-700" :
              s === "skipped" ? "text-warmstone-500" :
              "text-blue-700"
            }`}>{stats[s] ?? 0}</p>
            <p className="text-xs font-semibold text-warmstone-500 capitalize mt-0.5">{s}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-warmstone-200 rounded-lg px-3 py-1.5 bg-warmstone-white text-warmstone-700 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="replied">Replied</option>
          <option value="skipped">Skipped</option>
          <option value="saved">Saved</option>
        </select>

        <select
          value={subredditFilter}
          onChange={(e) => setSubredditFilter(e.target.value)}
          className="text-sm border border-warmstone-200 rounded-lg px-3 py-1.5 bg-warmstone-white text-warmstone-700 focus:outline-none"
        >
          <option value="all">All subreddits</option>
          {allSubreddits.map((s) => (
            <option key={s.id} value={s.name}>r/{s.name}</option>
          ))}
        </select>

        <span className="text-sm text-warmstone-400">{filtered.length} shown</span>
      </div>

      {/* Hits list */}
      {filtered.length === 0 ? (
        <div className="bg-warmstone-white border border-warmstone-200 rounded-lg py-16 text-center">
          <p className="text-warmstone-400 text-sm">No hits match your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((hit) => (
            <HitCard key={hit.id} hit={hit} onUpdate={updateHit} />
          ))}
        </div>
      )}
    </div>
  );
}
