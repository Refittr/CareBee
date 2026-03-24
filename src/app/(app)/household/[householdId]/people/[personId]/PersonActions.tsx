"use client";

import { useState } from "react";
import { QrCode, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { QRCodeDisplay } from "@/components/emergency/QRCodeDisplay";
import { PersonEditForm } from "./PersonEditForm";
import type { Person } from "@/lib/types/database";

interface PersonActionsProps {
  householdId: string;
  personId: string;
  person: Person;
  canEdit?: boolean;
}

export function PersonActions({ householdId, personId, person, canEdit = false }: PersonActionsProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={16} />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)}>
          <QrCode size={16} />
          <span className="hidden sm:inline">Emergency QR</span>
        </Button>
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="Emergency QR code">
        <QRCodeDisplay householdId={householdId} personId={personId} personName={`${person.first_name} ${person.last_name}`} />
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit details" maxWidth="lg">
        <PersonEditForm person={person} onSaved={() => setEditOpen(false)} />
      </Modal>
    </>
  );
}
