"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Calendar, NotebookPen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { useAppToast } from "@/components/layout/AppShell";
import { formatDateTime } from "@/lib/utils/dates";
import type { Appointment } from "@/lib/types/database";

type BadgeVariant = "info" | "active" | "neutral" | "error";

const statusConfig: Record<Appointment["status"], { label: string; variant: BadgeVariant }> = {
  upcoming: { label: "Upcoming", variant: "info" },
  completed: { label: "Completed", variant: "active" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  missed: { label: "Missed", variant: "error" },
};

export default function AppointmentsPage() {
  const params = useParams<{ householdId: string; personId: string }>();
  const { householdId, personId } = params;
  const supabase = createClient();
  const { addToast } = useAppToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [debriefTarget, setDebriefTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("appointments")
      .select("*")
      .eq("person_id", personId)
      .order("appointment_date");
    if (err) setError(err.message);
    else setAppointments(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [personId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("appointments").delete().eq("id", deleteTarget.id);
    if (err) addToast("Something went wrong. Please try again.", "error");
    else { addToast("Appointment removed.", "success"); setDeleteTarget(null); load(); }
    setDeleting(false);
  }

  if (loading) return <SkeletonLoader variant="card" count={3} />;
  if (error) return <Alert type="error" title="Could not load appointments" description={error} />;

  const now = new Date().toISOString();
  const upcoming = appointments.filter((a) => a.status === "upcoming" && a.appointment_date >= now);
  const past = appointments.filter((a) => a.status !== "upcoming" || a.appointment_date < now).reverse().slice(0, 10);

  function AppointmentCard({ appt }: { appt: Appointment }) {
    const { label, variant } = statusConfig[appt.status];
    const hasDebrief = appt.what_was_discussed || appt.what_was_agreed || appt.follow_up;
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-warmstone-900">{appt.title}</h3>
              <Badge variant={variant}>{label}</Badge>
            </div>
            <p className="text-sm text-warmstone-600">{formatDateTime(appt.appointment_date)}</p>
            {appt.location && <p className="text-sm text-warmstone-400">{appt.location}{appt.department ? `, ${appt.department}` : ""}</p>}
            {appt.professional_name && <p className="text-sm text-warmstone-400">{appt.professional_name}</p>}
            {appt.status === "completed" && (
              hasDebrief ? (
                <div className="mt-3 flex flex-col gap-1 text-sm">
                  {appt.what_was_discussed && <p className="text-warmstone-700"><span className="font-semibold">Discussed:</span> {appt.what_was_discussed}</p>}
                  {appt.what_was_agreed && <p className="text-warmstone-700"><span className="font-semibold">Agreed:</span> {appt.what_was_agreed}</p>}
                  {appt.follow_up && <p className="text-warmstone-700"><span className="font-semibold">Follow-up:</span> {appt.follow_up}</p>}
                </div>
              ) : (
                <div className="mt-3 bg-honey-50 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                  <p className="text-xs text-honey-800">How did this appointment go? Add your notes so you don&apos;t forget.</p>
                  <button onClick={() => setDebriefTarget(appt)} className="text-xs font-bold text-honey-800 hover:text-honey-600 whitespace-nowrap min-h-[44px] flex items-center">Add notes</button>
                </div>
              )
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditTarget(appt)} className="p-2 text-warmstone-400 hover:text-warmstone-800 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Pencil size={16} /></button>
            <button onClick={() => setDeleteTarget(appt)} className="p-2 text-warmstone-400 hover:text-error transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={16} /></button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-warmstone-900">Appointments</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add an appointment
        </Button>
      </div>

      {appointments.length === 0 ? (
        <EmptyState icon={Calendar} heading="No appointments recorded" description="Keep track of every appointment across all hospitals and services." ctaLabel="Add an appointment" onCta={() => setAddOpen(true)} />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-warmstone-600 mb-3 uppercase tracking-wide">Upcoming</h3>
              <div className="flex flex-col gap-3">
                {upcoming.map((a) => <AppointmentCard key={a.id} appt={a} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-warmstone-600 mb-3 uppercase tracking-wide">Past</h3>
              <div className="flex flex-col gap-3">
                {past.map((a) => <AppointmentCard key={a.id} appt={a} />)}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add an appointment" maxWidth="lg">
        <AppointmentForm householdId={householdId} personId={personId} onSaved={() => { setAddOpen(false); load(); }} onCancel={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit appointment" maxWidth="lg">
        {editTarget && <AppointmentForm householdId={householdId} personId={personId} appointment={editTarget} onSaved={() => { setEditTarget(null); load(); }} onCancel={() => setEditTarget(null)} />}
      </Modal>
      <Modal open={!!debriefTarget} onClose={() => setDebriefTarget(null)} title="Add appointment notes" maxWidth="lg">
        {debriefTarget && <AppointmentForm householdId={householdId} personId={personId} appointment={debriefTarget} debriefOnly onSaved={() => { setDebriefTarget(null); load(); }} onCancel={() => setDebriefTarget(null)} />}
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove appointment" description={`Are you sure you want to remove "${deleteTarget?.title}"?`} loading={deleting} />
    </div>
  );
}
