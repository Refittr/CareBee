"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  FileText, ChevronDown, ChevronUp, Copy, CheckCircle,
  Sparkles, X, Save, Download, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Input, Textarea } from "@/components/ui/Input";
import { useAppToast } from "@/components/layout/AppShell";
import { useCanEdit } from "@/lib/context/role";
import { useAIAccess } from "@/lib/utils/access";
import { UpgradeModal } from "@/components/ui/UpgradeModal";

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
    label: "Work and employment",
    key: "work",
    templates: [
      { id: "employer_letter", label: "Letter to employer (caring responsibilities)" },
      { id: "employer_push_back_doctors_note", label: "Push back on employer requesting a doctor's note" },
      { id: "employer_disclose_health_condition", label: "Disclose health condition and request support" },
    ],
  },
  {
    label: "Legal and other",
    key: "legal",
    templates: [
      { id: "opg_cover_letter", label: "Letter to the Office of the Public Guardian" },
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

// ---- Template-specific extra fields ----------------------------------------
// These are fields that collect context the AI cannot get from the care record.

const TEMPLATE_EXTRA_FIELDS: Record<string, { key: string; label: string; placeholder: string; hint?: string; options?: { value: string; label: string }[] }[]> = {
  employer_letter: [
    {
      key: "carer_name",
      label: "Your name (the carer)",
      placeholder: "e.g. Jane Smith",
      hint: "This letter is written by you, the carer, not the person you care for.",
    },
    {
      key: "employer_name",
      label: "Employer or manager name",
      placeholder: "e.g. Sarah Jones / Acme Ltd HR team",
    },
    {
      key: "caring_hours",
      label: "How many hours per week do you care?",
      placeholder: "e.g. around 20 hours per week",
    },
  ],
  carers_allowance: [
    {
      key: "carer_name",
      label: "Your name (the carer applying)",
      placeholder: "e.g. Jane Smith",
      hint: "Carer's Allowance is claimed by the carer, not the person being cared for.",
    },
  ],
  carers_assessment_request: [
    {
      key: "carer_name",
      label: "Your name (the carer requesting assessment)",
      placeholder: "e.g. Jane Smith",
    },
  ],
  employer_push_back_doctors_note: [
    {
      key: "your_name",
      label: "Your name",
      placeholder: "e.g. Jane Smith",
    },
    {
      key: "manager_name",
      label: "Manager or employer name",
      placeholder: "e.g. Sarah Jones",
    },
    {
      key: "company_name",
      label: "Company name",
      placeholder: "e.g. Acme Ltd",
    },
    {
      key: "location",
      label: "Where are you based?",
      placeholder: "",
      options: [
        { value: "England or Wales", label: "England or Wales" },
        { value: "Scotland", label: "Scotland" },
        { value: "Northern Ireland", label: "Northern Ireland" },
      ],
    },
    {
      key: "taken_sick_leave",
      label: "Have you taken any sick leave?",
      placeholder: "",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
    },
    {
      key: "appointments_management",
      label: "How have you managed appointments so far?",
      placeholder: "",
      options: [
        { value: "Annual leave", label: "Annual leave" },
        { value: "TOIL (time off in lieu)", label: "TOIL (time off in lieu)" },
        { value: "Unpaid leave", label: "Unpaid leave" },
        { value: "A mix of the above", label: "A mix of the above" },
      ],
    },
    {
      key: "satisfactory_output",
      label: "Has your work output been confirmed as satisfactory?",
      placeholder: "",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
        { value: "Not discussed", label: "Not discussed" },
      ],
    },
    {
      key: "employer_reason",
      label: "Reason your employer gave for requesting the note (optional)",
      placeholder: "e.g. Routine policy for absences over 3 days, or leave blank if no reason was given",
      hint: "Leave blank if no reason was given.",
    },
  ],
  employer_disclose_health_condition: [
    {
      key: "your_name",
      label: "Your name",
      placeholder: "e.g. Jane Smith",
    },
    {
      key: "manager_name",
      label: "Manager or employer name",
      placeholder: "e.g. Sarah Jones",
    },
    {
      key: "company_name",
      label: "Company name",
      placeholder: "e.g. Acme Ltd",
    },
    {
      key: "condition_description",
      label: "Nature of condition",
      placeholder: "e.g. a long-term health condition, a chronic pain condition, an autoimmune condition",
      hint: "You can be as vague or specific as you like. The letter will use your wording.",
    },
    {
      key: "support_requested",
      label: "What support or adjustments are you looking for?",
      placeholder: "e.g. occasional flexibility to attend medical appointments, the option to work from home on difficult days",
    },
    {
      key: "mention_equality_act",
      label: "Mention the Equality Act 2010?",
      placeholder: "",
      hint: "Only relevant if your condition qualifies as a disability under the Act.",
      options: [
        { value: "Yes, mention it", label: "Yes, reference the Equality Act 2010" },
        { value: "No, keep it informal", label: "No, keep it informal" },
      ],
    },
  ],
};

// ---- Main component --------------------------------------------------------

function openPrintWindow(title: string, content: string) {
  const lines = content
    .split("\n")
    .map((l) =>
      l.trim() === ""
        ? "<br/>"
        : `<p style="margin:0 0 6px 0">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title.replace(/</g, "&lt;")}</title><style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;margin:2.5cm;color:#111;}@media print{body{margin:2.5cm;}}</style></head><body>${lines}</body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to download as PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function LettersPageInner() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { addToast } = useAppToast();

  const canEdit = useCanEdit();
  const { hasAccess } = useAIAccess(householdId);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const preselectedTemplate = searchParams.get("template") ?? null;
  const preselectedEntitlementId = searchParams.get("entitlement_id") ?? null;

  const [personName, setPersonName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(preselectedTemplate);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [entitlementContext, setEntitlementContext] = useState<string | null>(null);
  const [entitlementLabel, setEntitlementLabel] = useState<string | null>(null);
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["benefits"]));

  const [generated, setGenerated] = useState<{ title: string; content: string } | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);

  const load = useCallback(async () => {
    const { data: person } = await supabase
      .from("people")
      .select("first_name, last_name")
      .eq("id", personId)
      .single();
    if (person) setPersonName(`${person.first_name} ${person.last_name}`);

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
    setGenerated(null);
    setError(null);
    setCustomTitle("");
    setExtraFieldValues({});
    if (id !== preselectedTemplate) setEntitlementContext(null);
  }

  async function generate() {
    const tid = selectedTemplate !== "custom" ? selectedTemplate : undefined;
    const cp = customPrompt.trim() || undefined;
    if (!tid && !cp) return;

    // Build extra context from template-specific fields
    const extraFields = tid ? (TEMPLATE_EXTRA_FIELDS[tid] ?? []) : [];
    const extraLines = extraFields
      .map((f) => extraFieldValues[f.key]?.trim() ? `${f.label}: ${extraFieldValues[f.key].trim()}` : null)
      .filter(Boolean);
    const extraContext = extraLines.length > 0 ? `ADDITIONAL DETAILS FROM THE CARER:\n${extraLines.join("\n")}` : undefined;

    setGenerating(true);
    setGenerated(null);
    setEditedContent("");
    setSavedId(null);
    setLastSavedContent("");
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
          entitlement_context: [entitlementContext, extraContext].filter(Boolean).join("\n\n") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && (data as { error?: string }).error === "ai_limit_reached") {
          setError(`You've used all ${(data as { limit?: number }).limit} AI calls this month. Upgrade your plan in Settings to continue.`);
        } else {
          setError((data as { error?: string }).error ?? "Could not generate text. Please try again.");
        }
        return;
      }

      const title = !tid
        ? (customTitle.trim() || (cp ? cp.slice(0, 60).trim() + (cp.length > 60 ? "..." : "") : data.title))
        : data.title;
      const content: string = data.content;

      setGenerated({ title, content });
      setEditedContent(content);
      setPreviewExpanded(true);

      // Auto-save to vault
      if (canEdit) {
        setAutoSaving(true);
        const { data: saved, error: saveErr } = await supabase
          .from("generated_letters")
          .insert({
            person_id: personId,
            household_id: householdId,
            title,
            content,
            template_id: tid ?? null,
            custom_prompt: cp ?? null,
            entitlement_context: entitlementContext ?? null,
            sent: false,
          })
          .select("id")
          .single();
        setAutoSaving(false);
        if (!saveErr && saved) {
          setSavedId(saved.id);
          setLastSavedContent(content);
          addToast("Letter saved to vault.", "success");
        }
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveToVault() {
    if (!generated) return;
    setSaving(true);
    const { data: saved, error: err } = await supabase.from("generated_letters").insert({
      person_id: personId,
      household_id: householdId,
      title: generated.title,
      content: editedContent,
      template_id: selectedTemplate !== "custom" ? selectedTemplate : null,
      custom_prompt: customPrompt.trim() || null,
      entitlement_context: entitlementContext ?? null,
      sent: false,
    }).select("id").single();
    if (err) {
      addToast(err.message ?? "Could not save. Please try again.", "error");
      setSaving(false);
      return;
    }
    if (saved) {
      setSavedId(saved.id);
      setLastSavedContent(editedContent);
    }
    addToast("Saved to letters vault.", "success");
    setSaving(false);
  }

  async function saveChanges() {
    if (!savedId || editedContent === lastSavedContent) return;
    setSavingChanges(true);
    const { error: err } = await supabase
      .from("generated_letters")
      .update({ content: editedContent })
      .eq("id", savedId);
    if (err) {
      addToast("Could not save changes. Please try again.", "error");
    } else {
      setLastSavedContent(editedContent);
      addToast("Changes saved.", "success");
    }
    setSavingChanges(false);
  }

  function copyText() {
    if (!generated) return;
    navigator.clipboard.writeText(editedContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canGenerate = (!!selectedTemplate && selectedTemplate !== "custom") || !!customPrompt.trim();

  return (
    <div className="flex flex-col gap-6">
      <UpgradeModal householdId={householdId} open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <div>
        <h2 className="font-bold text-warmstone-900 text-lg">Letters and documents</h2>
        <p className="text-sm text-warmstone-500 mt-0.5">
          Generate letter and document text for {personName || "this person"} using their care record.
        </p>
      </div>

      {error && <Alert type="error" description={error} />}

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
        {/* Template browser */}
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

        {/* Generate panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {selectedTemplate && (
            <div className="bg-warmstone-50 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <p className="font-semibold text-warmstone-900 text-sm">{templateLabel(selectedTemplate)}</p>
              <button onClick={() => { setSelectedTemplate(null); setGenerated(null); }}
                className="text-warmstone-400 hover:text-warmstone-800 min-h-[36px] min-w-[36px] flex items-center justify-center">
                <X size={15} />
              </button>
            </div>
          )}

          {/* Template-specific extra fields */}
          {selectedTemplate && (TEMPLATE_EXTRA_FIELDS[selectedTemplate] ?? []).length > 0 && (
            <div className="flex flex-col gap-3 bg-sage-50 border border-sage-100 rounded-lg p-4">
              <p className="text-xs font-bold text-sage-700 uppercase tracking-wide">Your details</p>
              {(TEMPLATE_EXTRA_FIELDS[selectedTemplate] ?? []).map((field) =>
                field.options ? (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-warmstone-800">{field.label}</label>
                    {field.hint && <p className="text-xs text-warmstone-400">{field.hint}</p>}
                    <select
                      value={extraFieldValues[field.key] ?? ""}
                      onChange={(e) => setExtraFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-warmstone-200 bg-warmstone-white px-3 py-2 text-sm text-warmstone-800 focus:outline-none focus:ring-2 focus:ring-honey-400 min-h-[44px]"
                    >
                      <option value="">Select...</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Input
                    key={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    hint={field.hint}
                    value={extraFieldValues[field.key] ?? ""}
                    onChange={(e) =>
                      setExtraFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )
              )}
            </div>
          )}

          {(selectedTemplate === "custom" || !selectedTemplate) && (
            <>
              <Input
                label="Title"
                placeholder="e.g. Letter to employer about caring responsibilities"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                hint="How this will be labelled in your letters vault."
              />
              <Textarea
                label={selectedTemplate === "custom" ? "Describe what you need" : "Or describe a custom letter"}
                placeholder="e.g. A letter to my employer explaining that I am a carer and may need flexible working..."
                rows={4}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </>
          )}

          {!canEdit ? (
            <Alert type="info" description="You have view-only access to this record. Generating and saving letters is not available." />
          ) : hasAccess === false ? (
            <>
              <Alert type="info" description="Generating letters is a premium feature. Subscribe to unlock it." />
              <Button onClick={() => setShowUpgrade(true)} variant="secondary">
                <Sparkles size={16} />
                Subscribe
              </Button>
            </>
          ) : (
            <Button onClick={generate} loading={generating} disabled={!canGenerate}>
              <Sparkles size={16} />
              {generating ? "Generating..." : "Generate text"}
            </Button>
          )}

          {/* Generated preview */}
          {(generating && !generated) && <SkeletonLoader variant="card" count={1} />}

          {!generating && generated && (
            <Card className="overflow-hidden">
              <button
                onClick={() => setPreviewExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left min-h-[56px]"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <p className="font-semibold text-warmstone-900 truncate">{generated.title}</p>
                  {autoSaving && (
                    <span className="text-xs text-warmstone-400 shrink-0">Saving...</span>
                  )}
                  {!autoSaving && savedId && editedContent === lastSavedContent && (
                    <span className="text-xs text-sage-600 font-semibold shrink-0">Saved</span>
                  )}
                </div>
                {previewExpanded ? <ChevronUp size={15} className="text-warmstone-400 shrink-0" /> : <ChevronDown size={15} className="text-warmstone-400 shrink-0" />}
              </button>

              {previewExpanded && (
                <div className="border-t border-warmstone-100">
                  <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-warmstone-50">
                    <button
                      onClick={copyText}
                      className="flex items-center gap-1.5 text-sm font-semibold text-warmstone-700 bg-warmstone-100 hover:bg-warmstone-200 px-3 py-2 rounded-md min-h-[40px] transition-colors"
                    >
                      {copied ? <CheckCircle size={14} className="text-sage-500" /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy text"}
                    </button>
                    <button
                      onClick={() => openPrintWindow(generated.title, editedContent)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-warmstone-700 bg-warmstone-100 hover:bg-warmstone-200 px-3 py-2 rounded-md min-h-[40px] transition-colors"
                    >
                      <Download size={14} /> Download PDF
                    </button>
                    {canEdit && savedId && editedContent !== lastSavedContent && (
                      <Button size="sm" onClick={saveChanges} loading={savingChanges}>
                        <Save size={14} />
                        Save changes
                      </Button>
                    )}
                    {canEdit && !savedId && !autoSaving && (
                      <Button size="sm" onClick={saveToVault} loading={saving}>
                        <Save size={14} />
                        Save to vault
                      </Button>
                    )}
                    {savedId && (
                      <Link
                        href="/letters-vault"
                        className="flex items-center gap-1.5 text-sm font-semibold text-honey-600 hover:text-honey-800 transition-colors ml-auto min-h-[40px]"
                      >
                        View in vault <ExternalLink size={13} />
                      </Link>
                    )}
                  </div>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full px-5 py-4 text-sm text-warmstone-800 leading-relaxed font-mono bg-transparent resize-none focus:outline-none min-h-[300px]"
                    spellCheck={false}
                  />
                </div>
              )}
            </Card>
          )}

          {!generating && !generated && !selectedTemplate && !customPrompt && (
            <EmptyState
              icon={FileText}
              heading="Pick a template or write your own"
              description="Generated text is saved to your letters vault so you can copy and reuse it any time."
            />
          )}
        </div>
      </div>
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
