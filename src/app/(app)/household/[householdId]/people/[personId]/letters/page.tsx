"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  FileText, ChevronDown, ChevronUp, Copy, CheckCircle,
  RotateCcw, Sparkles, Trash2, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Textarea } from "@/components/ui/Input";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateUK } from "@/lib/utils/dates";

// ---- Types -----------------------------------------------------------------

interface SavedLetter {
  id: string;
  title: string;
  content: string;
  created_at: string;
  template_id: string | null;
  entitlement_context: string | null;
  custom_prompt: string | null;
}

// ---- Template definitions --------------------------------------------------

const TEMPLATE_CATEGORIES = [
  {
    label: "Benefits and financial support",
    key: "benefits",
    templates: [
      { id: "attendance_allowance", label: "Attendance Allowance supporting statement" },
      { id: "pip_statement", label: "PIP supporting statement" },
      { id: "carers_allowance", label: "Carer's Allowance application helper" },
      { id: "blue_badge", label: "Blue Badge application" },
      { id: "council_tax_reduction", label: "Council tax reduction request" },
      { id: "disabled_facilities_grant", label: "Disabled Facilities Grant letter" },
      { id: "nhs_continuing_healthcare", label: "NHS Continuing Healthcare checklist" },
      { id: "benefit_appeal", label: "Benefit appeal letter" },
      { id: "mandatory_reconsideration", label: "Mandatory reconsideration request" },
    ],
  },
  {
    label: "NHS and health",
    key: "nhs",
    templates: [
      { id: "gp_referral_request", label: "GP referral request" },
      { id: "waiting_list_chase", label: "Waiting list chase letter" },
      { id: "pals_complaint", label: "PALS complaint letter" },
      { id: "nhs_complaint_formal", label: "Formal NHS complaint" },
      { id: "subject_access_request", label: "Subject Access Request (medical records)" },
      { id: "gp_summary", label: "GP summary letter" },
      { id: "medication_summary", label: "Medication summary (hospital admission)" },
    ],
  },
  {
    label: "Care and social services",
    key: "care",
    templates: [
      { id: "care_needs_assessment_request", label: "Request a care needs assessment" },
      { id: "carers_assessment_request", label: "Request a carer's assessment" },
      { id: "care_complaint", label: "Complaint about care services" },
      { id: "care_package_review", label: "Request a review of a care package" },
    ],
  },
  {
    label: "Education and SEND",
    key: "send",
    templates: [
      { id: "ehc_needs_assessment", label: "Request an EHC needs assessment" },
      { id: "ehcp_annual_review", label: "EHCP annual review parental response" },
      { id: "send_tribunal_appeal", label: "SEND tribunal appeal letter" },
    ],
  },
  {
    label: "Legal and other",
    key: "legal",
    templates: [
      { id: "opg_cover_letter", label: "Letter to the Office of the Public Guardian" },
      { id: "employer_letter", label: "Letter to employer (caring responsibilities)" },
      { id: "custom", label: "Write your own" },
    ],
  },
] as const;

function templateLabel(id: string): string {
  for (const cat of TEMPLATE_CATEGORIES) {
    const t = cat.templates.find((t) => t.id === id);
    if (t) return t.label;
  }
  return id;
}

// ---- Saved letter storage (localStorage per person) -----------------------
// Stored locally so no extra table migration needed.

function storageKey(personId: string) {
  return `carebee_letters_${personId}`;
}

function loadLetters(personId: string): SavedLetter[] {
  try {
    const raw = localStorage.getItem(storageKey(personId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLetter(personId: string, letter: SavedLetter) {
  const existing = loadLetters(personId).filter((l) => l.id !== letter.id);
  const updated = [letter, ...existing];
  localStorage.setItem(storageKey(personId), JSON.stringify(updated));
  return updated;
}

function deleteLetter(personId: string, id: string): SavedLetter[] {
  const updated = loadLetters(personId).filter((l) => l.id !== id);
  localStorage.setItem(storageKey(personId), JSON.stringify(updated));
  return updated;
}

// ---- Letter card -----------------------------------------------------------

function LetterCard({
  letter,
  onCopy,
  onRegenerate,
  onDelete,
  regenerating,
}: {
  letter: SavedLetter;
  onCopy: (text: string) => void;
  onRegenerate: (letter: SavedLetter) => void;
  onDelete: (id: string) => void;
  regenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(letter.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy(letter.content);
    });
  }

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left min-h-[56px]"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-warmstone-900 truncate">{letter.title}</p>
          <p className="text-xs text-warmstone-400 mt-0.5">{formatDateUK(letter.created_at)}</p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-warmstone-400 shrink-0" /> : <ChevronDown size={16} className="text-warmstone-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-warmstone-100">
          {/* Actions */}
          <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-warmstone-50">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-sm font-semibold text-warmstone-700 bg-warmstone-100 hover:bg-warmstone-200 px-3 py-2 rounded-md min-h-[40px] transition-colors"
            >
              {copied ? <CheckCircle size={14} className="text-sage-500" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy text"}
            </button>
            <button
              onClick={() => onRegenerate(letter)}
              disabled={regenerating}
              className="flex items-center gap-1.5 text-sm font-semibold text-honey-800 bg-honey-50 hover:bg-honey-100 px-3 py-2 rounded-md min-h-[40px] transition-colors disabled:opacity-60"
            >
              <RotateCcw size={14} className={regenerating ? "animate-spin" : ""} />
              Regenerate
            </button>
            <button
              onClick={() => onDelete(letter.id)}
              className="flex items-center gap-1.5 text-sm text-warmstone-400 hover:text-error px-3 py-2 rounded-md min-h-[40px] transition-colors ml-auto"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
          {/* Content */}
          <div className="px-5 py-4 whitespace-pre-wrap text-sm text-warmstone-800 leading-relaxed font-mono max-h-[500px] overflow-y-auto">
            {letter.content}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---- Main component --------------------------------------------------------

function LettersPageInner() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { addToast } = useAppToast();

  const preselectedTemplate = searchParams.get("template") ?? null;
  const preselectedEntitlementId = searchParams.get("entitlement_id") ?? null;

  const [personName, setPersonName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(preselectedTemplate);
  const [customPrompt, setCustomPrompt] = useState("");
  const [entitlementContext, setEntitlementContext] = useState<string | null>(null);
  const [entitlementLabel, setEntitlementLabel] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["benefits"]));
  const [letters, setLetters] = useState<SavedLetter[]>([]);

  const load = useCallback(async () => {
    const { data: person } = await supabase
      .from("people")
      .select("first_name, last_name")
      .eq("id", personId)
      .single();
    if (person) setPersonName(`${person.first_name} ${person.last_name}`);

    setLetters(loadLetters(personId));

    if (preselectedEntitlementId) {
      const { data: ent } = await supabase
        .from("entitlements")
        .select("benefit_name, reasoning")
        .eq("id", preselectedEntitlementId)
        .single();
      if (ent) {
        setEntitlementContext(`${ent.benefit_name}: ${ent.reasoning}`);
        setEntitlementLabel(ent.benefit_name);
      }
    }
  }, [personId, preselectedEntitlementId, supabase]);

  useEffect(() => { load(); }, [load]);

  // Auto-expand the category of the preselected template
  useEffect(() => {
    if (!preselectedTemplate) return;
    for (const cat of TEMPLATE_CATEGORIES) {
      if (cat.templates.some((t) => t.id === preselectedTemplate)) {
        setExpandedCats((prev) => new Set([...prev, cat.key]));
        break;
      }
    }
  }, [preselectedTemplate]);

  function toggleCat(key: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function selectTemplate(id: string) {
    setSelectedTemplate(id);
    setError(null);
    if (id !== preselectedTemplate) setEntitlementContext(null);
  }

  async function generate(overrideLetter?: SavedLetter) {
    const tid = overrideLetter?.template_id ?? (selectedTemplate !== "custom" ? selectedTemplate : undefined);
    const cp = overrideLetter?.custom_prompt ?? (customPrompt.trim() || undefined);
    const ec = overrideLetter?.entitlement_context ?? entitlementContext ?? undefined;

    if (!tid && !cp) return;

    if (overrideLetter) setRegeneratingId(overrideLetter.id);
    else setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId,
          household_id: householdId,
          template_id: tid,
          custom_prompt: cp,
          entitlement_context: ec,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not generate text. Please try again.");
        return;
      }

      const newLetter: SavedLetter = {
        id: overrideLetter?.id ?? crypto.randomUUID(),
        title: data.title,
        content: data.content,
        created_at: new Date().toISOString(),
        template_id: tid ?? null,
        entitlement_context: ec ?? null,
        custom_prompt: cp ?? null,
      };

      const updated = saveLetter(personId, newLetter);
      setLetters(updated);
      if (!overrideLetter) {
        // reset form
        setSelectedTemplate(null);
        setCustomPrompt("");
        setEntitlementContext(null);
        setEntitlementLabel(null);
      }
      addToast("Generated and saved.", "success");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setGenerating(false);
      setRegeneratingId(null);
    }
  }

  function handleDelete(id: string) {
    const updated = deleteLetter(personId, id);
    setLetters(updated);
  }

  const canGenerate = (!!selectedTemplate && selectedTemplate !== "custom") || !!customPrompt.trim();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-bold text-warmstone-900 text-lg">Letters and documents</h2>
        <p className="text-sm text-warmstone-500 mt-0.5">
          Generate letter and document text for {personName || "this person"} using their care record. Copy and paste the result when you need it.
        </p>
      </div>

      {error && <Alert type="error" description={error} />}

      {/* Entitlement context notice */}
      {entitlementLabel && (
        <div className="bg-sage-50 border border-sage-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Sparkles size={15} className="text-sage-600 shrink-0" />
          <p className="text-sm text-sage-800 flex-1">
            Linked to: <span className="font-semibold">{entitlementLabel}</span>
          </p>
          <button onClick={() => { setEntitlementContext(null); setEntitlementLabel(null); }}
            className="text-sage-400 hover:text-sage-800 min-h-[36px] min-w-[36px] flex items-center justify-center">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: template browser */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <p className="text-xs font-bold text-warmstone-500 uppercase tracking-wide mb-2">Choose a template</p>
          <div className="flex flex-col gap-0.5">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <div key={cat.key}>
                <button
                  onClick={() => toggleCat(cat.key)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-warmstone-700 hover:bg-warmstone-50 rounded-md min-h-[44px] transition-colors"
                >
                  {cat.label}
                  {expandedCats.has(cat.key) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {expandedCats.has(cat.key) && (
                  <div className="ml-2 flex flex-col gap-0.5 mb-1">
                    {cat.templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectTemplate(t.id)}
                        className={[
                          "text-left px-3 py-2 text-sm rounded-md min-h-[40px] transition-colors",
                          selectedTemplate === t.id
                            ? "bg-honey-100 text-honey-900 font-semibold"
                            : "text-warmstone-600 hover:bg-warmstone-50 hover:text-warmstone-900",
                        ].join(" ")}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: generate panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {selectedTemplate && (
            <div className="bg-warmstone-50 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <p className="font-semibold text-warmstone-900 text-sm">{templateLabel(selectedTemplate)}</p>
              <button onClick={() => setSelectedTemplate(null)}
                className="text-warmstone-400 hover:text-warmstone-800 min-h-[36px] min-w-[36px] flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
          )}

          {(selectedTemplate === "custom" || !selectedTemplate) && (
            <Textarea
              label={selectedTemplate === "custom" ? "Describe what you need" : "Or describe a custom letter"}
              placeholder="e.g. A letter to my employer explaining that I am a carer and may need flexible working..."
              rows={4}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          )}

          <Button
            onClick={() => generate()}
            loading={generating}
            disabled={!canGenerate}
          >
            <Sparkles size={16} />
            {generating ? "Generating..." : "Generate text"}
          </Button>

          {generating && <SkeletonLoader variant="card" count={1} />}

          {!generating && !selectedTemplate && !customPrompt && letters.length === 0 && (
            <EmptyState
              icon={FileText}
              heading="Pick a template or write your own"
              description="Generated text is saved here automatically so you can come back, copy, and regenerate any time."
            />
          )}
        </div>
      </div>

      {/* Saved letters list */}
      {letters.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-warmstone-500 uppercase tracking-wide">Saved ({letters.length})</p>
          {letters.map((letter) => (
            <LetterCard
              key={letter.id}
              letter={letter}
              onCopy={() => addToast("Copied to clipboard.", "success")}
              onRegenerate={generate}
              onDelete={handleDelete}
              regenerating={regeneratingId === letter.id}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-warmstone-400 border-t border-warmstone-100 pt-4">
        Generated text is based on this person's care record. Always review before sending. For formal advice, contact Citizens Advice or a qualified adviser.
      </p>
    </div>
  );
}

export default function LettersPage() {
  return (
    <Suspense fallback={<SkeletonLoader variant="card" count={3} />}>
      <LettersPageInner />
    </Suspense>
  );
}
