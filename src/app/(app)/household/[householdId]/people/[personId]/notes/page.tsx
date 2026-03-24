"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Pin, StickyNote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { CareNoteForm } from "@/components/forms/CareNoteForm";
import { useAppToast } from "@/components/layout/AppShell";
import { useCanEdit } from "@/lib/context/role";
import { formatDateUK } from "@/lib/utils/dates";
import type { CareNote, CareNoteCategory } from "@/lib/types/database";

const CATEGORY_LABELS: Record<CareNoteCategory, string> = {
  general: "General",
  communication: "Communication",
  behaviour: "Behaviour",
  preferences: "Preferences",
  professional_contacts: "Professional contacts",
  benefits_advice: "Benefits advice",
  important_context: "Important context",
};

type BadgeVariant = "active" | "warning" | "error" | "neutral";

const CATEGORY_VARIANTS: Record<CareNoteCategory, BadgeVariant> = {
  general: "neutral",
  communication: "active",
  behaviour: "warning",
  preferences: "neutral",
  professional_contacts: "neutral",
  benefits_advice: "warning",
  important_context: "error",
};

type CareNoteWithCreator = CareNote & { creator_name?: string | null };

const TRUNCATE_AT = 240;

export default function NotesPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();
  const canEdit = useCanEdit();

  const [notes, setNotes] = useState<CareNoteWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CareNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CareNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data, error: err } = await supabase
      .from("care_notes")
      .select("*, profiles!created_by(full_name)")
      .eq("person_id", personId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setNotes((data ?? []).map((row: any) => ({
      ...(row as CareNote),
      creator_name: (row.profiles as { full_name?: string | null } | null)?.full_name ?? null,
    })));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [personId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(data: { title: string; category: CareNoteCategory; content: string; is_pinned: boolean }) {
    if (!currentUserId) return;
    setSaving(true);
    const { error: err } = await supabase.from("care_notes").insert({
      ...data,
      person_id: personId,
      household_id: householdId,
      created_by: currentUserId,
    });
    if (err) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Note added.", "success");
      setAddOpen(false);
      load();
    }
    setSaving(false);
  }

  async function handleEdit(data: { title: string; category: CareNoteCategory; content: string; is_pinned: boolean }) {
    if (!editTarget) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("care_notes")
      .update(data)
      .eq("id", editTarget.id);
    if (err) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Note updated.", "success");
      setEditTarget(null);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("care_notes").delete().eq("id", deleteTarget.id);
    if (err) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      addToast("Note removed.", "success");
      setDeleteTarget(null);
      load();
    }
    setDeleting(false);
  }

  async function handleTogglePin(note: CareNote) {
    const { error: err } = await supabase
      .from("care_notes")
      .update({ is_pinned: !note.is_pinned })
      .eq("id", note.id);
    if (err) {
      addToast("Something went wrong. Please try again.", "error");
    } else {
      load();
    }
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load notes" description={error} />;

  const pinned = notes.filter((n) => n.is_pinned);
  const unpinned = notes.filter((n) => !n.is_pinned);

  function NoteCard({ note }: { note: CareNoteWithCreator }) {
    const isExpanded = expanded[note.id];
    const shouldTruncate = note.content.length > TRUNCATE_AT;

    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {note.is_pinned && <Pin size={13} className="text-honey-500 shrink-0" />}
              <p className="font-bold text-warmstone-900">{note.title}</p>
              <Badge variant={CATEGORY_VARIANTS[note.category]}>
                {CATEGORY_LABELS[note.category]}
              </Badge>
            </div>
            <p className="text-sm text-warmstone-700 whitespace-pre-line leading-relaxed">
              {shouldTruncate && !isExpanded ? note.content.slice(0, TRUNCATE_AT) + "..." : note.content}
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setExpanded((e) => ({ ...e, [note.id]: !e[note.id] }))}
                className="text-xs text-honey-600 font-semibold mt-1"
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            )}
            <p className="text-xs text-warmstone-400 mt-2">
              {note.creator_name ? `Added by ${note.creator_name}` : "Added"}{", "}
              {formatDateUK(note.created_at.split("T")[0])}
              {note.updated_at !== note.created_at && (
                <> &middot; Updated {formatDateUK(note.updated_at.split("T")[0])}</>
              )}
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleTogglePin(note)}
                className={`p-2 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  note.is_pinned
                    ? "text-honey-500 hover:text-warmstone-400"
                    : "text-warmstone-300 hover:text-honey-500"
                }`}
                aria-label={note.is_pinned ? "Unpin" : "Pin"}
              >
                <Pin size={15} />
              </button>
              <button
                onClick={() => setEditTarget(note)}
                className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setDeleteTarget(note)}
                className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-warmstone-900">Care Notes</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add a note
          </Button>
        )}
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          heading="No notes yet"
          description="Add notes about anything that matters. Communication needs, care preferences, professional contacts, things that have been tried before, or anything else that someone involved in the care should know."
          ctaLabel="Add a note"
          onCta={canEdit ? () => setAddOpen(true) : undefined}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {pinned.length > 0 && (
            <div className="bg-honey-50 border border-honey-100 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-honey-600 uppercase tracking-wide flex items-center gap-1.5">
                <Pin size={12} /> Pinned
              </p>
              {pinned.map((note) => <NoteCard key={note.id} note={note} />)}
            </div>
          )}

          {unpinned.length > 0 && (
            <div className="flex flex-col gap-3">
              {unpinned.map((note) => <NoteCard key={note.id} note={note} />)}
            </div>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a note" maxWidth="md">
        <CareNoteForm
          onSave={handleAdd}
          onCancel={() => setAddOpen(false)}
          loading={saving}
        />
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit note"
        maxWidth="md"
      >
        {editTarget && (
          <CareNoteForm
            initial={editTarget}
            onSave={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={saving}
          />
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove note"
        description={`Remove the note "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  );
}
