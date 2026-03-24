"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail, RefreshCw, ChevronDown, ChevronUp, Clock, Copy, Check,
  Download, Share2, Pill, Calendar, FlaskConical, Sparkles,
  AlertTriangle, FileText, Clock3, Gift, User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useAppToast } from "@/components/layout/AppShell";
import type { DigestLog } from "@/lib/types/database";

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Parse the label of a change line to pick an icon + colour
function lineIcon(line: string): { icon: React.ReactNode; color: string } {
  const l = line.toLowerCase();
  if (l.startsWith("medications added") || l.startsWith("medications stopped"))
    return { icon: <Pill size={13} />, color: "text-sage-600" };
  if (l.startsWith("upcoming appointments") || l.startsWith("appointments attended"))
    return { icon: <Calendar size={13} />, color: "text-honey-600" };
  if (l.startsWith("new test results"))
    return { icon: <FlaskConical size={13} />, color: "text-info" };
  if (l.startsWith("new health insights"))
    return { icon: <Sparkles size={13} />, color: "text-honey-600" };
  if (l.startsWith("drug interactions"))
    return { icon: <AlertTriangle size={13} />, color: "text-error" };
  if (l.startsWith("waiting list"))
    return { icon: <Clock3 size={13} />, color: "text-warmstone-500" };
  if (l.startsWith("entitlement"))
    return { icon: <Gift size={13} />, color: "text-sage-600" };
  if (l.startsWith("documents"))
    return { icon: <FileText size={13} />, color: "text-warmstone-500" };
  if (l.startsWith("new conditions"))
    return { icon: <User size={13} />, color: "text-error" };
  return { icon: null, color: "text-warmstone-600" };
}

interface ParsedSection {
  type: "household" | "person";
  label: string;
  lines: string[];
}

function parseContent(text: string): { dateRange: string; sections: ParsedSection[] } {
  const allLines = text.split("\n");
  // First line is "CareBee weekly update: <dateRange>"
  const headerLine = allLines[0] ?? "";
  const dateRange = headerLine.replace(/^CareBee weekly update:\s*/i, "").trim();

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const raw of allLines.slice(1)) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("===") && line.endsWith("===")) {
      if (current) sections.push(current);
      current = { type: "household", label: line.replace(/===/g, "").trim(), lines: [] };
    } else if (line.startsWith("---") && line.endsWith("---")) {
      if (current) sections.push(current);
      current = { type: "person", label: line.replace(/---/g, "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return { dateRange, sections };
}

const BEE_SVG = `<svg width="28" height="28" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="4" cy="6.5" rx="3.2" ry="1.6" fill="#E8A817" opacity="0.3" transform="rotate(-20 4 6.5)"/>
  <ellipse cx="12" cy="6.5" rx="3.2" ry="1.6" fill="#E8A817" opacity="0.3" transform="rotate(20 12 6.5)"/>
  <ellipse cx="8" cy="11" rx="2.4" ry="3.5" fill="#E8A817"/>
  <rect x="5.6" y="9.2" width="4.8" height="1" rx="0.5" fill="white" opacity="0.55"/>
  <rect x="5.6" y="11.2" width="4.8" height="1" rx="0.5" fill="white" opacity="0.55"/>
  <ellipse cx="8" cy="7.2" rx="2" ry="1.6" fill="#E8A817"/>
  <circle cx="8" cy="5" r="1.5" fill="#E8A817"/>
  <line x1="7.2" y1="3.8" x2="5.8" y2="2" stroke="#E8A817" stroke-width="0.8" stroke-linecap="round"/>
  <line x1="8.8" y1="3.8" x2="10.2" y2="2" stroke="#E8A817" stroke-width="0.8" stroke-linecap="round"/>
  <circle cx="5.6" cy="1.8" r="0.5" fill="#E8A817"/><circle cx="10.4" cy="1.8" r="0.5" fill="#E8A817"/>
</svg>`;

const PRINT_HEADER = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">${BEE_SVG}<h1>Care<span style="color:#E8A817">Bee</span> weekly update</h1></div>`;
const PRINT_FOOTER = `<p style="font-size:9pt;color:#b0a89f;margin-top:32px">This is an automated summary from CareBee. This is not medical advice.</p>`;
const PRINT_STYLE = `<style>body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;margin:2cm;color:#3d3530}h1{font-size:16pt;margin:0 0 4px}p.date{color:#9e9490;font-size:10pt;margin:0 0 24px}@media print{body{margin:2cm}}</style>`;

function personSectionHtml(section: ParsedSection) {
  const linesHtml = section.lines.map((l) =>
    l.startsWith("No changes")
      ? `<p style="color:#9e9490;font-style:italic;margin:4px 0">${l}</p>`
      : `<p style="margin:4px 0;color:#3d3530">${l.replace(/</g, "&lt;")}</p>`
  ).join("");
  return `<div style="margin-bottom:16px;padding:12px 16px;background:#faf9f7;border-radius:6px;border-left:3px solid #E8A817">
    <p style="font-weight:700;color:#3d3530;margin:0 0 8px">${section.label}</p>
    ${linesHtml}
  </div>`;
}

function launchPrintWindow(title: string, bodyHtml: string) {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to download."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>${PRINT_STYLE}</head><body>${bodyHtml}${PRINT_FOOTER}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function openPrintWindow(subject: string, content: string) {
  const { dateRange, sections } = parseContent(content);
  const sectionsHtml = sections.map((s) => {
    if (s.type === "household") {
      return `<h2 style="font-size:14pt;color:#3d3530;margin:24px 0 8px;border-bottom:2px solid #E8A817;padding-bottom:4px">${s.label}</h2>`;
    }
    return personSectionHtml(s);
  }).join("");

  launchPrintWindow(subject, `${PRINT_HEADER}<p class="date">${dateRange}</p>${sectionsHtml}`);
}

function PersonSectionActions({ section, dateRange, subject }: { section: ParsedSection; dateRange: string; subject: string }) {
  const { addToast } = useAppToast();
  const [copied, setCopied] = useState(false);

  const personText = `CareBee weekly update: ${dateRange}\n\n--- ${section.label} ---\n${section.lines.join("\n")}`;
  const personTitle = `${subject} — ${section.label}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(personText);
    setCopied(true);
    addToast("Copied to clipboard.", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    launchPrintWindow(personTitle, `${PRINT_HEADER}<p class="date">${dateRange}</p>${personSectionHtml(section)}`);
  }

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: personTitle, text: personText }); } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        className="p-1.5 rounded text-warmstone-400 hover:text-warmstone-700 hover:bg-warmstone-100 transition-colors"
      >
        {copied ? <Check size={13} className="text-sage-500" /> : <Copy size={13} />}
      </button>
      <button
        onClick={handleDownload}
        title="Save as PDF"
        className="p-1.5 rounded text-warmstone-400 hover:text-warmstone-700 hover:bg-warmstone-100 transition-colors"
      >
        <Download size={13} />
      </button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          onClick={handleShare}
          title="Share"
          className="p-1.5 rounded text-warmstone-400 hover:text-warmstone-700 hover:bg-warmstone-100 transition-colors"
        >
          <Share2 size={13} />
        </button>
      )}
    </div>
  );
}

function DigestDisplay({ content, dateRange, subject }: { content: string; dateRange?: string; subject?: string }) {
  const parsed = parseContent(content);
  const dr = dateRange ?? parsed.dateRange;
  const subj = subject ?? `CareBee weekly update: ${dr}`;
  const personSections = parsed.sections.filter((s) => s.type === "person");

  return (
    <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-warmstone-100">
      {/* Branded header */}
      <div className="bg-honey-400 px-5 py-4 flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <ellipse cx="4" cy="6.5" rx="3.2" ry="1.6" fill="white" opacity="0.4" transform="rotate(-20 4 6.5)"/>
          <ellipse cx="12" cy="6.5" rx="3.2" ry="1.6" fill="white" opacity="0.4" transform="rotate(20 12 6.5)"/>
          <ellipse cx="8" cy="11" rx="2.4" ry="3.5" fill="white"/>
          <rect x="5.6" y="9.2" width="4.8" height="1" rx="0.5" fill="#E8A817" opacity="0.7"/>
          <rect x="5.6" y="11.2" width="4.8" height="1" rx="0.5" fill="#E8A817" opacity="0.7"/>
          <ellipse cx="8" cy="7.2" rx="2" ry="1.6" fill="white"/>
          <circle cx="8" cy="5" r="1.5" fill="white"/>
          <line x1="7.2" y1="3.8" x2="5.8" y2="2" stroke="white" strokeWidth="0.8" strokeLinecap="round"/>
          <line x1="8.8" y1="3.8" x2="10.2" y2="2" stroke="white" strokeWidth="0.8" strokeLinecap="round"/>
          <circle cx="5.6" cy="1.8" r="0.5" fill="white"/><circle cx="10.4" cy="1.8" r="0.5" fill="white"/>
        </svg>
        <div>
          <p className="font-bold text-white text-base leading-tight">CareBee weekly update</p>
          <p className="text-white/80 text-xs mt-0.5">{dr}</p>
        </div>
      </div>

      {/* Person sections */}
      <div className="bg-white divide-y divide-warmstone-50">
        {personSections.map((section, i) => {
          const hasChanges = !section.lines.some((l) => l.startsWith("No changes"));
          return (
            <div key={i} className="px-5 py-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-bold text-warmstone-900 text-sm flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-honey-400 shrink-0" />
                  {section.label}
                </p>
                <PersonSectionActions section={section} dateRange={dr} subject={subj} />
              </div>
              {hasChanges ? (
                <div className="flex flex-col gap-1.5">
                  {section.lines.map((line, j) => {
                    const { icon, color } = lineIcon(line);
                    const [label, ...rest] = line.split(": ");
                    const value = rest.join(": ");
                    return (
                      <div key={j} className="flex items-start gap-2">
                        {icon && <span className={`shrink-0 mt-0.5 ${color}`}>{icon}</span>}
                        <p className="text-sm text-warmstone-700 leading-snug">
                          <span className="font-semibold text-warmstone-800">{label}</span>
                          {value ? <span className="text-warmstone-600">: {value}</span> : null}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-warmstone-400 italic">No changes this week.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-warmstone-50 px-5 py-3 border-t border-warmstone-100">
        <p className="text-xs text-warmstone-400">This is an automated summary from CareBee. This is not medical advice.</p>
      </div>
    </div>
  );
}

function ShareBar({ subject, content }: { subject: string; content: string }) {
  const { addToast } = useAppToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    addToast("Copied to clipboard.", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: subject, text: content });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  }

  function handleDownload() {
    openPrintWindow(subject, content);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-warmstone-100 text-warmstone-700 hover:bg-warmstone-200 transition-colors min-h-[36px]"
      >
        {copied ? <Check size={14} className="text-sage-500" /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy text"}
      </button>
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-warmstone-100 text-warmstone-700 hover:bg-warmstone-200 transition-colors min-h-[36px]"
      >
        <Download size={14} />
        Save as PDF
      </button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md bg-warmstone-100 text-warmstone-700 hover:bg-warmstone-200 transition-colors min-h-[36px]"
        >
          <Share2 size={14} />
          Share
        </button>
      )}
    </div>
  );
}

function DigestCard({ log }: { log: DigestLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start justify-between gap-3 px-5 py-4 text-left w-full"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-warmstone-900 text-sm truncate">{log.subject}</p>
          <p className="text-xs text-warmstone-400 mt-0.5 flex items-center gap-1">
            <Clock size={11} />
            Generated {formatDateLong(log.created_at)}
          </p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-warmstone-400 shrink-0 mt-0.5" />
          : <ChevronDown size={16} className="text-warmstone-400 shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="border-t border-warmstone-100 flex flex-col gap-3 p-4">
          <DigestDisplay content={log.content_text} subject={log.subject} />
          <ShareBar subject={log.subject} content={log.content_text} />
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
    <div className="px-4 py-6 md:px-8 max-w-2xl flex flex-col gap-6">
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
        <div className="flex flex-col gap-3">
          <DigestDisplay content={preview.content_text} dateRange={preview.dateRange} subject={preview.subject} />
          <ShareBar subject={preview.subject} content={preview.content_text} />
          <p className="text-xs text-warmstone-400">
            This is the same content that would be emailed on your chosen digest day.{" "}
            <a href="/settings" className="text-honey-600 font-semibold hover:underline">Change settings</a>
          </p>
        </div>
      )}

      <section>
        <h2 className="text-sm font-bold text-warmstone-500 uppercase tracking-wide mb-3">Past updates</h2>

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
