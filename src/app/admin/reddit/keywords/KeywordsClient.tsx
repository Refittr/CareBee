"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft, ToggleLeft, ToggleRight } from "lucide-react";
import type { RedditKeyword } from "./page";
import Link from "next/link";

interface Props {
  initialKeywords: RedditKeyword[];
}

export function KeywordsClient({ initialKeywords }: Props) {
  const [keywords, setKeywords] = useState<RedditKeyword[]>(initialKeywords);
  const [phrase, setPhrase] = useState("");
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const cats = Array.from(new Set(keywords.map((k) => k.category ?? "Uncategorised")));
    return cats.sort();
  }, [keywords]);

  const existingCategories = useMemo(() => {
    return Array.from(new Set(keywords.map((k) => k.category).filter(Boolean))) as string[];
  }, [keywords]);

  const grouped = useMemo(() => {
    const map: Record<string, RedditKeyword[]> = {};
    for (const k of keywords) {
      const cat = k.category ?? "Uncategorised";
      if (!map[cat]) map[cat] = [];
      map[cat].push(k);
    }
    return map;
  }, [keywords]);

  async function addKeyword() {
    if (!phrase.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/reddit/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: phrase.trim(), category: category.trim() || null }),
      });
      const data = await res.json() as RedditKeyword;
      setKeywords((prev) => [...prev, { ...data, hit_count: 0 }]);
      setPhrase("");
      setCategory("");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setKeywords((prev) => prev.map((k) => k.id === id ? { ...k, is_active: !current } : k));
    await fetch("/api/admin/reddit/keywords", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
  }

  async function deleteKeyword(id: string) {
    if (!confirm("Delete this keyword?")) return;
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    await fetch("/api/admin/reddit/keywords", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  function toggleCollapse(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
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
          <h1 className="text-xl font-bold text-warmstone-900">Keywords</h1>
          <p className="text-sm text-warmstone-500">{keywords.length} keywords across {categories.length} categories</p>
        </div>
      </div>

      {/* Add form */}
      <div className="bg-warmstone-white border border-warmstone-200 rounded-lg p-4">
        <h2 className="text-sm font-bold text-warmstone-700 uppercase tracking-wide mb-3">Add keyword</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            placeholder="Search phrase"
            className="flex-1 text-sm border border-warmstone-200 rounded-lg px-3 py-2 text-warmstone-800 bg-warmstone-50 focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "#d4a853" } as React.CSSProperties}
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            placeholder="Category (optional)"
            list="category-list"
            className="sm:w-48 text-sm border border-warmstone-200 rounded-lg px-3 py-2 text-warmstone-800 bg-warmstone-50 focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "#d4a853" } as React.CSSProperties}
          />
          <datalist id="category-list">
            {existingCategories.map((c) => <option key={c} value={c} />)}
          </datalist>
          <button
            onClick={addKeyword}
            disabled={adding || !phrase.trim()}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors shrink-0"
            style={{ backgroundColor: "#d4a853" }}
          >
            <Plus size={14} />
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {/* Grouped keywords */}
      <div className="flex flex-col gap-3">
        {categories.map((cat) => {
          const items = grouped[cat] ?? [];
          const isCollapsed = collapsed.has(cat);
          const activeCount = items.filter((k) => k.is_active).length;

          return (
            <div key={cat} className="bg-warmstone-white border border-warmstone-200 rounded-lg overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCollapse(cat)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-warmstone-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight size={15} className="text-warmstone-400" /> : <ChevronDown size={15} className="text-warmstone-400" />}
                  <span className="font-semibold text-sm text-warmstone-900">{cat}</span>
                  <span className="text-xs text-warmstone-400">{activeCount}/{items.length} active</span>
                </div>
                <span className="text-xs text-warmstone-400">
                  {items.reduce((sum, k) => sum + (k.hit_count ?? 0), 0)} hits
                </span>
              </button>

              {/* Keywords list */}
              {!isCollapsed && (
                <div className="border-t border-warmstone-100">
                  {items.map((kw) => (
                    <div key={kw.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-warmstone-50 last:border-0 hover:bg-warmstone-50">
                      <button
                        onClick={() => toggleActive(kw.id, kw.is_active)}
                        className="shrink-0 text-warmstone-400 hover:text-warmstone-700 transition-colors"
                        aria-label={kw.is_active ? "Deactivate" : "Activate"}
                      >
                        {kw.is_active
                          ? <ToggleRight size={20} style={{ color: "#d4a853" }} />
                          : <ToggleLeft size={20} />
                        }
                      </button>
                      <span className={`flex-1 text-sm ${kw.is_active ? "text-warmstone-800" : "text-warmstone-400 line-through"}`}>
                        {kw.phrase}
                      </span>
                      {(kw.hit_count ?? 0) > 0 && (
                        <span className="text-xs font-semibold text-warmstone-500 bg-warmstone-100 px-2 py-0.5 rounded-full shrink-0">
                          {kw.hit_count} hits
                        </span>
                      )}
                      <button
                        onClick={() => deleteKeyword(kw.id)}
                        className="shrink-0 text-warmstone-300 hover:text-red-500 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
