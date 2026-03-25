"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  BookUser, Plus, Pencil, Trash2, Phone, Mail, MapPin, ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { useAppToast } from "@/components/layout/AppShell";
import type { Contact, ContactType, HouseholdMember } from "@/lib/types/database";

const CONTACT_TYPE_ORDER: ContactType[] = [
  "gp", "pharmacy", "hospital", "consultant", "therapist",
  "social_worker", "care_agency", "school", "benefits", "solicitor", "other",
];

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  gp: "GP",
  pharmacy: "Pharmacy",
  hospital: "Hospital",
  consultant: "Consultant",
  therapist: "Therapist",
  social_worker: "Social Worker",
  care_agency: "Care Agency",
  school: "School",
  benefits: "Benefits",
  solicitor: "Solicitor",
  other: "Other",
};

interface ContactFormData {
  contact_type: ContactType;
  name: string;
  role: string;
  organisation: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_primary: boolean;
}

const emptyForm: ContactFormData = {
  contact_type: "gp",
  name: "",
  role: "",
  organisation: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  is_primary: false,
};

interface FamilyMember {
  id: string;
  full_name: string;
  role: string;
}

export default function ContactsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [canEdit, setCanEdit] = useState(false);
  const [personName, setPersonName] = useState("");

  // Auto-populate suggestion state
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Partial<ContactFormData>[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [savingSuggestions, setSavingSuggestions] = useState(false);

  const load = useCallback(async () => {
    const [
      { data: ctcts, error: err },
      { data: person },
      { data: members },
    ] = await Promise.all([
      supabase.from("contacts").select("*").eq("person_id", personId).order("display_order").order("created_at"),
      supabase.from("people").select("first_name, last_name, gp_surgery, gp_name").eq("id", personId).single(),
      supabase.from("household_members").select("user_id, role").eq("household_id", householdId),
    ]);
    if (err) { setError(err.message); return; }
    setContacts(ctcts ?? []);

    if (person) {
      setPersonName(`${person.first_name} ${person.last_name}`);
      if ((ctcts ?? []).length === 0) {
        const suggested: Partial<ContactFormData>[] = [];
        if (person.gp_surgery || person.gp_name) {
          suggested.push({
            contact_type: "gp",
            name: person.gp_name ?? person.gp_surgery ?? "GP",
            organisation: person.gp_surgery ?? undefined,
            is_primary: true,
          });
        }
        if (suggested.length > 0) {
          setSuggestions(suggested);
          setSuggestOpen(true);
          setSelectedSuggestions(new Set(suggested.map((_, i) => i)));
        }
      }
    }

    if (members) {
      // Load profile names separately
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      setFamily(
        members.map((m) => ({
          id: m.user_id,
          full_name: profileMap.get(m.user_id) ?? "Unknown",
          role: m.role,
        }))
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const myMembership = members.find((m) => m.user_id === user.id);
        if (myMembership) setCanEdit(myMembership.role === "owner" || myMembership.role === "editor");
      }
    }
  }, [personId, householdId, supabase]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  function openAdd() {
    setForm(emptyForm);
    setFormError(null);
    setAddOpen(true);
  }

  function openEdit(c: Contact) {
    setForm({
      contact_type: c.contact_type,
      name: c.name,
      role: c.role ?? "",
      organisation: c.organisation ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
      is_primary: c.is_primary,
    });
    setFormError(null);
    setEditTarget(c);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    setSaving(true);
    setFormError(null);
    const payload = {
      contact_type: form.contact_type,
      name: form.name.trim(),
      role: form.role.trim() || null,
      organisation: form.organisation.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      is_primary: form.is_primary,
    };
    let err;
    if (editTarget) {
      ({ error: err } = await supabase.from("contacts").update(payload).eq("id", editTarget.id));
    } else {
      ({ error: err } = await supabase.from("contacts").insert({ ...payload, person_id: personId, household_id: householdId, display_order: 0 }));
    }
    if (err) { setFormError(err.message); } else {
      addToast(editTarget ? "Contact updated." : "Contact added.", "success");
      setAddOpen(false);
      setEditTarget(null);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("contacts").delete().eq("id", deleteTarget.id);
    if (err) addToast("Something went wrong. Please try again.", "error");
    else { addToast("Contact removed.", "success"); setDeleteTarget(null); load(); }
    setDeleting(false);
  }

  async function acceptSuggestions() {
    setSavingSuggestions(true);
    const toInsert = suggestions
      .filter((_, i) => selectedSuggestions.has(i))
      .map((s) => ({
        person_id: personId,
        household_id: householdId,
        contact_type: s.contact_type ?? "other",
        name: s.name ?? "",
        role: s.role ?? null,
        organisation: s.organisation ?? null,
        phone: s.phone ?? null,
        email: s.email ?? null,
        address: s.address ?? null,
        notes: s.notes ?? null,
        is_primary: s.is_primary ?? false,
        display_order: 0,
      }));
    if (toInsert.length > 0) {
      await supabase.from("contacts").insert(toInsert);
    }
    setSuggestOpen(false);
    setSavingSuggestions(false);
    load();
  }

  function toggleGroup(type: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load contacts" description={error} />;

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.role ?? "").toLowerCase().includes(q) || (c.organisation ?? "").toLowerCase().includes(q);
  });

  const grouped = CONTACT_TYPE_ORDER
    .map((type) => ({ type, items: filtered.filter((c) => c.contact_type === type) }))
    .filter(({ items }) => items.length > 0);

  const roleLabels: Record<string, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer", emergency_only: "Emergency only" };

  return (
    <div className="flex flex-col gap-4">
      {/* Auto-populate suggestion */}
      {suggestOpen && suggestions.length > 0 && canEdit && (
        <div className="bg-honey-50 border border-honey-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-honey-800 mb-3">
            We found some contact details in {personName ? `${personName.split(" ")[0]}'s` : "their"} record. Would you like to add them?
          </p>
          <div className="flex flex-col gap-2 mb-3">
            {suggestions.map((s, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSuggestions.has(i)}
                  onChange={() => {
                    setSelectedSuggestions((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    });
                  }}
                  className="w-4 h-4 accent-honey-400"
                />
                <span className="text-sm text-warmstone-800">
                  <span className="font-semibold">{CONTACT_TYPE_LABELS[s.contact_type ?? "other"]}: </span>
                  {s.name}{s.organisation ? ` (${s.organisation})` : ""}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={savingSuggestions} onClick={acceptSuggestions}>
              Add selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSuggestOpen(false)}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-warmstone-900">Contacts</h2>
        {canEdit && (
          <Button size="sm" onClick={openAdd}>
            <Plus size={16} /> Add contact
          </Button>
        )}
      </div>

      {/* Search */}
      {contacts.length > 3 && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warmstone-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-warmstone-200 rounded-md bg-warmstone-50 text-sm text-warmstone-900 placeholder-warmstone-400 focus:outline-none focus:ring-2 focus:ring-honey-400 min-h-[44px]"
          />
        </div>
      )}

      {/* Empty state */}
      {contacts.length === 0 && (
        <EmptyState
          icon={BookUser}
          heading="No contacts added yet"
          description={`Add the key people involved in ${personName ? `${personName.split(" ")[0]}'s` : "their"} care so everyone in the care circle knows who to call.`}
          ctaLabel="Add a contact"
          onCta={canEdit ? openAdd : undefined}
        />
      )}

      {/* Contact groups */}
      {grouped.map(({ type, items }) => {
        const isCollapsed = collapsedGroups.has(type);
        return (
          <div key={type}>
            <button
              onClick={() => toggleGroup(type)}
              className="flex items-center gap-2 w-full text-left min-h-[44px] mb-2"
            >
              <h3 className="font-bold text-warmstone-800 text-sm uppercase tracking-wide flex-1">
                {CONTACT_TYPE_LABELS[type as ContactType]}
              </h3>
              {isCollapsed ? <ChevronDown size={16} className="text-warmstone-400" /> : <ChevronUp size={16} className="text-warmstone-400" />}
            </button>
            {!isCollapsed && (
              <div className="flex flex-col gap-3">
                {items.map((c) => (
                  <Card key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h4 className="font-bold text-warmstone-900">{c.name}</h4>
                          {c.is_primary && <Badge variant="active">Primary</Badge>}
                        </div>
                        {(c.role || c.organisation) && (
                          <p className="text-sm text-warmstone-600">
                            {[c.role, c.organisation].filter(Boolean).join(", ")}
                          </p>
                        )}
                        <div className="flex flex-col gap-1.5 mt-2">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-honey-700 hover:text-honey-900 font-semibold min-h-[36px]">
                              <Phone size={14} />
                              {c.phone}
                            </a>
                          )}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-honey-700 hover:text-honey-900 min-h-[36px]">
                              <Mail size={14} />
                              {c.email}
                            </a>
                          )}
                          {c.address && (
                            <p className="flex items-start gap-2 text-sm text-warmstone-500">
                              <MapPin size={14} className="shrink-0 mt-0.5" />
                              {c.address}
                            </p>
                          )}
                          {c.notes && (
                            <p className="text-xs text-warmstone-400 italic mt-1">{c.notes}</p>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEdit(c)} className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Edit">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => setDeleteTarget(c)} className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Family members */}
      {family.length > 0 && (
        <div>
          <h3 className="font-bold text-warmstone-800 text-sm uppercase tracking-wide mb-3">Care circle</h3>
          <div className="flex flex-col gap-2">
            {family.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-warmstone-900">{m.full_name}</p>
                    <p className="text-sm text-warmstone-500 capitalize">{roleLabels[m.role] ?? m.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={addOpen || !!editTarget}
        onClose={() => { setAddOpen(false); setEditTarget(null); }}
        title={editTarget ? "Edit contact" : "Add a contact"}
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          {formError && <Alert type="error" description={formError} />}
          <Select
            label="Type"
            value={form.contact_type}
            onChange={(e) => setForm((f) => ({ ...f, contact_type: e.target.value as ContactType }))}
            required
          >
            {CONTACT_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>
            ))}
          </Select>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Dr Sarah Patel"
            required
          />
          <Input
            label="Role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="e.g. Consultant Cardiologist"
          />
          <Input
            label="Organisation"
            value={form.organisation}
            onChange={(e) => setForm((f) => ({ ...f, organisation: e.target.value }))}
            placeholder="e.g. Royal Liverpool Hospital"
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. 0151 706 2000"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. cardiology@rlbuht.nhs.uk"
          />
          <Textarea
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            rows={2}
            placeholder="e.g. Prescot Street, Liverpool, L7 8XP"
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="e.g. Best to call before 10am"
          />
          <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
              className="w-4 h-4 accent-honey-400"
            />
            <span className="text-sm font-semibold text-warmstone-800">Primary contact for this type</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button loading={saving} onClick={handleSave}>Save</Button>
            <Button variant="ghost" onClick={() => { setAddOpen(false); setEditTarget(null); }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove contact"
        description={`Are you sure you want to remove "${deleteTarget?.name}"?`}
        loading={deleting}
      />
    </div>
  );
}
