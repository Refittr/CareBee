"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowLeft, ToggleLeft, ToggleRight } from "lucide-react";
import type { RedditSubreddit } from "./page";
import Link from "next/link";

interface Props {
  initialSubreddits: RedditSubreddit[];
}

export function SubredditsClient({ initialSubreddits }: Props) {
  const [subreddits, setSubreddits] = useState<RedditSubreddit[]>(initialSubreddits);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addSubreddit() {
    const cleaned = name.trim().replace(/^r\//, "");
    if (!cleaned) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reddit/subreddits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleaned }),
      });
      const data = await res.json() as RedditSubreddit & { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to add"); return; }
      setSubreddits((prev) => [...prev, { ...data, hit_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setSubreddits((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
    await fetch("/api/admin/reddit/subreddits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
  }

  async function deleteSubreddit(id: string, name: string) {
    if (!confirm(`Remove r/${name}?`)) return;
    setSubreddits((prev) => prev.filter((s) => s.id !== id));
    await fetch("/api/admin/reddit/subreddits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/reddit"
          className="flex items-center gap-1.5 text-sm font-semibold text-warmstone-500 hover:text-warmstone-800 transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
        <div>
          <h1 className="text-xl font-bold text-warmstone-900">Subreddits</h1>
          <p className="text-sm text-warmstone-500">{subreddits.filter((s) => s.is_active).length} of {subreddits.length} active</p>
        </div>
      </div>

      {/* Add form */}
      <div className="bg-warmstone-white border border-warmstone-200 rounded-lg p-4">
        <h2 className="text-sm font-bold text-warmstone-700 uppercase tracking-wide mb-3">Add subreddit</h2>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border border-warmstone-200 rounded-lg bg-warmstone-50 overflow-hidden focus-within:ring-2" style={{ "--tw-ring-color": "#d4a853" } as React.CSSProperties}>
            <span className="px-3 text-sm text-warmstone-400 font-semibold shrink-0">r/</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/^r\//, ""))}
              onKeyDown={(e) => e.key === "Enter" && addSubreddit()}
              placeholder="subredditname"
              className="flex-1 text-sm py-2 pr-3 text-warmstone-800 bg-transparent focus:outline-none"
            />
          </div>
          <button
            onClick={addSubreddit}
            disabled={adding || !name.trim()}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors shrink-0"
            style={{ backgroundColor: "#d4a853" }}
          >
            <Plus size={14} />
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Subreddits table */}
      <div className="bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden">
        <div className="border-b border-warmstone-100 px-4 py-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
          <span className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Subreddit</span>
          <span className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide text-right">Hits</span>
          <span className="text-xs font-semibold text-warmstone-500 uppercase tracking-wide">Active</span>
          <span />
        </div>
        {subreddits.length === 0 ? (
          <div className="py-10 text-center text-sm text-warmstone-400">No subreddits added yet.</div>
        ) : (
          subreddits.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-warmstone-50 last:border-0 hover:bg-warmstone-50">
              <span className={`text-sm font-semibold ${s.is_active ? "text-warmstone-900" : "text-warmstone-400"}`}>
                r/{s.name}
              </span>
              <span className="text-xs font-semibold text-warmstone-500 bg-warmstone-100 px-2 py-0.5 rounded-full text-right">
                {s.hit_count ?? 0}
              </span>
              <button
                onClick={() => toggleActive(s.id, s.is_active)}
                aria-label={s.is_active ? "Deactivate" : "Activate"}
              >
                {s.is_active
                  ? <ToggleRight size={22} style={{ color: "#d4a853" }} />
                  : <ToggleLeft size={22} className="text-warmstone-300" />
                }
              </button>
              <button
                onClick={() => deleteSubreddit(s.id, s.name)}
                className="text-warmstone-300 hover:text-red-500 transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
