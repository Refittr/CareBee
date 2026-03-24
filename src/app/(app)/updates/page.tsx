"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, RefreshCw, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useAppToast } from "@/components/layout/AppShell";
import type { DigestLog } from "@/lib/types/database";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function DigestCard({ log }: { log: DigestLog }) {
  const [expanded, setExpanded] = useState(false);

  const lines = log.content_text
    .split("\n")
    .slice(2); // skip "CareBee weekly update: ..." header line and blank line

  return (
    <Card className="flex flex-col gap-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start justify-between gap-3 p-5 text-left w-full"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-warmstone-900 text-sm truncate">{log.subject}</p>
          <p className="text-xs text-warmstone-400 mt-0.5 flex items-center gap-1">
            <Clock size={11} />
            Generated {formatDate(log.created_at)}
          </p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-warmstone-400 shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-warmstone-400 shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-warmstone-100">
          <div className="mt-4 font-mono text-xs text-warmstone-700 bg-warmstone-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
            {lines.join("\n")}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function UpdatesPage() {
  const { addToast } = useAppToast();

  const [logs, setLogs] = useState<DigestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; content_text: string; dateRange: string } | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/digest/preview");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  async function generate() {
    setGenerating(true);
    setPreview(null);
    try {
      const res = await fetch("/api/digest/preview", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Could not generate update.", "error");
      } else {
        setPreview({ subject: data.subject, content_text: data.content_text, dateRange: data.dateRange });
        addToast("Update generated.", "success");
        await loadLogs();
      }
    } catch {
      addToast("Could not generate update.", "error");
    }
    setGenerating(false);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-warmstone-900">Weekly updates</h1>
          <p className="text-sm text-warmstone-600 mt-0.5">
            A summary of everything that changed across your care records in the past 7 days.
          </p>
        </div>
        <Button onClick={generate} disabled={generating} className="gap-2 shrink-0">
          <RefreshCw size={16} className={generating ? "animate-spin" : ""} />
          {generating ? "Generating..." : "Generate now"}
        </Button>
      </div>

      {preview && (
        <div className="bg-honey-50 border border-honey-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={16} className="text-honey-600" />
            <p className="font-bold text-warmstone-900 text-sm">{preview.subject}</p>
          </div>
          <div className="font-mono text-xs text-warmstone-700 bg-warmstone-white rounded-lg p-4 whitespace-pre-wrap leading-relaxed border border-warmstone-100">
            {preview.content_text.split("\n").slice(2).join("\n")}
          </div>
          <p className="text-xs text-warmstone-400 mt-3">
            This is the same content that would be emailed to you on your chosen digest day. To change the day or turn updates on, go to <a href="/settings" className="text-honey-600 font-semibold hover:underline">Settings</a>.
          </p>
        </div>
      )}

      <section>
        <h2 className="text-sm font-bold text-warmstone-600 uppercase tracking-wide mb-3">Past updates</h2>

        {loading ? (
          <SkeletonLoader count={3} />
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-warmstone-400">
            <Mail size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No updates generated yet</p>
            <p className="text-xs mt-1">Click "Generate now" to see a preview of this week's summary.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map((log) => (
              <DigestCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
