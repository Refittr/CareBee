"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, ChevronDown, ChevronUp, Copy, CheckCircle, Download, Trash2, RotateCcw, Send, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { ConfirmModal } from "@/components/ui/Modal";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateUK } from "@/lib/utils/dates";
import type { GeneratedLetter } from "@/lib/types/database";

interface LetterWithPerson extends GeneratedLetter {
  person_name: string;
  household_name: string;
  household_id: string;
}

function openPrintWindow(title: string, content: string) {
  const lines = content
    .split("\n")
    .map((l) =>
      l.trim() === ""
        ? "<br/>"
        : `<p style="margin:0 0 6px 0">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title.replace(/</g, "&lt;")}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 2.5cm; color: #111; }
  @media print { body { margin: 2.5cm; } }
</style>
</head>
<body>${lines}</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to download as PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function LetterCard({
  letter,
  onDelete,
  onRegenerate,
  onToggleSent,
}: {
  letter: LetterWithPerson;
  onDelete: (id: string) => void;
  onRegenerate: (letter: LetterWithPerson) => void;
  onToggleSent: (id: string, sent: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [togglingСent, setToggingSent] = useState(false);

  function copy() {
    navigator.clipboard.writeText(letter.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleRegenerate() {
    setRegenerating(true);
    await onRegenerate(letter);
    setRegenerating(false);
  }

  async function handleToggleSent() {
    setToggingSent(true);
    await onToggleSent(letter.id, !letter.sent);
    setToggingSent(false);
  }

  return (
    <>
      <Card className="overflow-hidden">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left min-h-[60px]"
        >
          <FileText size={16} className="text-warmstone-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-warmstone-900 truncate">{letter.title}</p>
            <p className="text-xs text-warmstone-400 mt-0.5">
              {letter.person_name} · {formatDateUK(letter.created_at)}
            </p>
          </div>
          {expanded ? <ChevronUp size={15} className="text-warmstone-400 shrink-0" /> : <ChevronDown size={15} className="text-warmstone-400 shrink-0" />}
        </button>

        {expanded && (
          <div className="border-t border-warmstone-100">
            <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-warmstone-50">
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-sm font-semibold text-warmstone-700 bg-warmstone-100 hover:bg-warmstone-200 px-3 py-2 rounded-md min-h-[40px] transition-colors"
              >
                {copied ? <CheckCircle size={14} className="text-sage-500" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy text"}
              </button>
              <button
                onClick={() => openPrintWindow(letter.title, letter.content)}
                className="flex items-center gap-1.5 text-sm font-semibold text-warmstone-700 bg-warmstone-100 hover:bg-warmstone-200 px-3 py-2 rounded-md min-h-[40px] transition-colors"
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1.5 text-sm font-semibold text-honey-800 bg-honey-50 hover:bg-honey-100 px-3 py-2 rounded-md min-h-[40px] transition-colors disabled:opacity-60"
              >
                <RotateCcw size={14} className={regenerating ? "animate-spin" : ""} />
                Regenerate
              </button>
              <button
                onClick={handleToggleSent}
                disabled={togglingСent}
                className={[
                  "flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-md min-h-[40px] transition-colors disabled:opacity-60",
                  letter.sent
                    ? "text-warmstone-600 bg-warmstone-100 hover:bg-warmstone-200"
                    : "text-sage-800 bg-sage-50 hover:bg-sage-100",
                ].join(" ")}
              >
                {letter.sent ? <Undo2 size={14} /> : <Send size={14} />}
                {letter.sent ? "Mark as unsent" : "Mark as sent"}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-sm text-warmstone-400 hover:text-error px-3 py-2 rounded-md min-h-[40px] transition-colors ml-auto"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
            <div className="px-5 py-4 whitespace-pre-wrap text-sm text-warmstone-800 leading-relaxed font-mono max-h-[500px] overflow-y-auto">
              {letter.content}
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { onDelete(letter.id); setConfirmDelete(false); }}
        title="Delete this letter"
        description={`Are you sure you want to delete "${letter.title}"? This cannot be undone.`}
      />
    </>
  );
}

function LetterGroup({
  letters,
  onDelete,
  onRegenerate,
  onToggleSent,
}: {
  letters: LetterWithPerson[];
  onDelete: (id: string) => void;
  onRegenerate: (letter: LetterWithPerson) => void;
  onToggleSent: (id: string, sent: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
      {letters.map((letter) => (
        <LetterCard
          key={letter.id}
          letter={letter}
          onDelete={onDelete}
          onRegenerate={onRegenerate}
          onToggleSent={onToggleSent}
        />
      ))}
    </div>
  );
}

export default function LettersVaultPage() {
  const supabase = createClient();
  const router = useRouter();
  const { addToast } = useAppToast();

  const [letters, setLetters] = useState<LetterWithPerson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: memberships } = await supabase
      .from("household_members")
      .select("household_id")
      .not("accepted_at", "is", null);

    const householdIds = (memberships ?? []).map((m) => m.household_id);
    if (householdIds.length === 0) { setLoading(false); return; }

    const [{ data: rawLetters }, { data: people }, { data: households }] = await Promise.all([
      supabase
        .from("generated_letters")
        .select("*")
        .in("household_id", householdIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("household_id", householdIds),
      supabase
        .from("households")
        .select("id, name")
        .in("id", householdIds),
    ]);

    const personMap = new Map((people ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
    const householdMap = new Map((households ?? []).map((h) => [h.id, h.name]));

    const enriched: LetterWithPerson[] = (rawLetters ?? []).map((l) => ({
      ...(l as GeneratedLetter),
      person_name: personMap.get(l.person_id) ?? "Unknown",
      household_name: householdMap.get(l.household_id) ?? "Unknown",
      household_id: l.household_id,
    }));

    setLetters(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    await supabase.from("generated_letters").delete().eq("id", id);
    setLetters((prev) => prev.filter((l) => l.id !== id));
    addToast("Letter deleted.", "success");
  }

  async function handleToggleSent(id: string, sent: boolean) {
    const { error } = await supabase
      .from("generated_letters")
      .update({ sent })
      .eq("id", id);
    if (error) { addToast("Could not update. Please try again.", "error"); return; }
    setLetters((prev) => prev.map((l) => l.id === id ? { ...l, sent } : l));
  }

  async function handleRegenerate(letter: LetterWithPerson) {
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: letter.person_id,
          household_id: letter.household_id,
          template_id: letter.template_id ?? undefined,
          custom_prompt: letter.custom_prompt ?? undefined,
          entitlement_context: letter.entitlement_context ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error ?? "Could not regenerate.", "error"); return; }

      const now = new Date().toISOString();
      await supabase
        .from("generated_letters")
        .update({ content: data.content, updated_at: now })
        .eq("id", letter.id);

      setLetters((prev) =>
        prev.map((l) => l.id === letter.id ? { ...l, content: data.content, updated_at: now } : l)
      );
      addToast("Regenerated.", "success");
    } catch {
      addToast("Could not regenerate. Please try again.", "error");
    }
  }

  const unsent = letters.filter((l) => !l.sent);
  const sent = letters.filter((l) => l.sent);

  // Group unsent by household
  const unsentGrouped = unsent.reduce<Record<string, { name: string; letters: LetterWithPerson[] }>>((acc, l) => {
    if (!acc[l.household_id]) acc[l.household_id] = { name: l.household_name, letters: [] };
    acc[l.household_id].letters.push(l);
    return acc;
  }, {});

  const sentGrouped = sent.reduce<Record<string, { name: string; letters: LetterWithPerson[] }>>((acc, l) => {
    if (!acc[l.household_id]) acc[l.household_id] = { name: l.household_name, letters: [] };
    acc[l.household_id].letters.push(l);
    return acc;
  }, {});

  const multiHousehold = new Set(letters.map((l) => l.household_id)).size > 1;

  return (
    <div className="flex flex-col gap-0 min-h-screen">
      <Header title="Letters vault" />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-6">

        <p className="text-sm text-warmstone-500">
          All your saved letters and documents, ready to copy or download.
        </p>

        {loading && <SkeletonLoader variant="card" count={4} />}

        {!loading && letters.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <FileText size={40} className="text-warmstone-200" />
            <div>
              <p className="font-semibold text-warmstone-700">No letters saved yet</p>
              <p className="text-sm text-warmstone-400 mt-1">Generate a letter from a person&apos;s Letters tab and save it to the vault.</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm font-semibold text-honey-700 hover:text-honey-900 min-h-[40px]"
            >
              Go to care records
            </button>
          </div>
        )}

        {!loading && letters.length > 0 && (
          <>
            {/* Unsent letters */}
            {unsent.length > 0 && (
              <div className="flex flex-col gap-4">
                {Object.entries(unsentGrouped).map(([householdId, group]) => (
                  <div key={householdId}>
                    {multiHousehold && (
                      <p className="text-xs font-bold text-warmstone-400 uppercase tracking-wide mb-3">{group.name}</p>
                    )}
                    <LetterGroup
                      letters={group.letters.slice(0, 5)}
                      onDelete={handleDelete}
                      onRegenerate={handleRegenerate}
                      onToggleSent={handleToggleSent}
                    />
                    {group.letters.length > 5 && (
                      <p className="text-xs text-warmstone-400 mt-2 text-center">Scroll to see all {group.letters.length} letters</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Sent letters */}
            {sent.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-warmstone-200" />
                  <span className="text-xs font-bold text-warmstone-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Send size={11} /> Sent
                  </span>
                  <div className="flex-1 h-px bg-warmstone-200" />
                </div>
                <div className="flex flex-col gap-4">
                  {Object.entries(sentGrouped).map(([householdId, group]) => (
                    <div key={householdId}>
                      {multiHousehold && (
                        <p className="text-xs font-bold text-warmstone-400 uppercase tracking-wide mb-3">{group.name}</p>
                      )}
                      <LetterGroup
                        letters={group.letters.slice(0, 5)}
                        onDelete={handleDelete}
                        onRegenerate={handleRegenerate}
                        onToggleSent={handleToggleSent}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
