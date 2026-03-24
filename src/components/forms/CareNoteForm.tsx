"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CareNote, CareNoteCategory } from "@/lib/types/database";

const CATEGORIES: { value: CareNoteCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "communication", label: "Communication" },
  { value: "behaviour", label: "Behaviour" },
  { value: "preferences", label: "Preferences" },
  { value: "professional_contacts", label: "Professional contacts" },
  { value: "benefits_advice", label: "Benefits advice" },
  { value: "important_context", label: "Important context" },
];

type FormData = {
  title: string;
  category: CareNoteCategory;
  content: string;
  is_pinned: boolean;
};

type Props = {
  initial?: CareNote;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  loading?: boolean;
};

export function CareNoteForm({ initial, onSave, onCancel, loading }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<CareNoteCategory>(initial?.category ?? "general");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isPinned, setIsPinned] = useState(initial?.is_pinned ?? false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ title: title.trim(), category, content: content.trim(), is_pinned: isPinned });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-semibold text-warmstone-800 mb-1">
          Title <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border border-warmstone-200 rounded-md px-3 py-2 text-sm text-warmstone-900 focus:outline-none focus:ring-2 focus:ring-honey-400 min-h-[44px]"
          placeholder="e.g. Communication needs, Benefits advice from advisor"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-warmstone-800 mb-1">
          Category <span className="text-error">*</span>
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CareNoteCategory)}
          className="w-full border border-warmstone-200 rounded-md px-3 py-2 text-sm text-warmstone-900 focus:outline-none focus:ring-2 focus:ring-honey-400 min-h-[44px] bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-warmstone-800 mb-1">
          Note <span className="text-error">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={7}
          className="w-full border border-warmstone-200 rounded-md px-3 py-2 text-sm text-warmstone-900 focus:outline-none focus:ring-2 focus:ring-honey-400 resize-y"
          placeholder="Write the note here. Be as specific as possible. This context will be used by AI features."
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-honey-400"
        />
        <div>
          <span className="text-sm font-semibold text-warmstone-800">Pin this note</span>
          <p className="text-xs text-warmstone-500 mt-0.5">Pinned notes stay at the top and are always visible.</p>
        </div>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initial ? "Save changes" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
