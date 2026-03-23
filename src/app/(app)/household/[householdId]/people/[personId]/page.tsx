import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { HeartPulse, Pill, ShieldCheck, Calendar, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ScanDocumentButton } from "@/components/scan/ScanDocumentButton";
import { formatDateUK, formatDateTime } from "@/lib/utils/dates";
import type { Metadata } from "next";

type Props = { params: Promise<{ householdId: string; personId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { personId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("first_name, last_name").eq("id", personId).single();
  return { title: `${data?.first_name} ${data?.last_name} | CareBee` };
}

export default async function PersonOverviewPage({ params }: Props) {
  const { householdId, personId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: person }, { data: conditions }, { data: medications }, { data: allergies }, { data: appointments }, { data: documents }] =
    await Promise.all([
      supabase.from("people").select("*").eq("id", personId).single(),
      supabase.from("conditions").select("name, is_active").eq("person_id", personId).order("created_at"),
      supabase.from("medications").select("name, dosage, is_active").eq("person_id", personId).order("created_at"),
      supabase.from("allergies").select("name").eq("person_id", personId),
      supabase.from("appointments").select("title, appointment_date, location, status").eq("person_id", personId).order("appointment_date"),
      supabase.from("documents").select("id", { count: "exact" }).eq("person_id", personId),
    ]);

  if (!person) notFound();

  const baseUrl = `/household/${householdId}/people/${personId}`;
  const activeConditions = conditions?.filter((c) => c.is_active) ?? [];
  const activeMedications = medications?.filter((m) => m.is_active) ?? [];
  const nextAppointment = appointments?.find((a) => a.status === "upcoming");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ScanDocumentButton householdId={householdId} personId={personId} />
      </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Link href={`${baseUrl}/conditions`}>
        <Card hoverable clickable className="p-5 h-full">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse size={18} className="text-honey-600" />
            <h2 className="font-bold text-warmstone-900">Conditions</h2>
          </div>
          <p className="text-2xl font-bold text-warmstone-900 mb-2">{activeConditions.length}</p>
          {activeConditions.slice(0, 3).map((c) => (
            <p key={c.name} className="text-sm text-warmstone-600 truncate">{c.name}</p>
          ))}
          {activeConditions.length === 0 && (
            <p className="text-sm text-warmstone-400">None recorded</p>
          )}
          <p className="text-xs text-honey-600 font-semibold mt-3">View all conditions</p>
        </Card>
      </Link>

      <Link href={`${baseUrl}/medications`}>
        <Card hoverable clickable className="p-5 h-full">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={18} className="text-honey-600" />
            <h2 className="font-bold text-warmstone-900">Medications</h2>
          </div>
          <p className="text-2xl font-bold text-warmstone-900 mb-2">{activeMedications.length}</p>
          {activeMedications.slice(0, 3).map((m) => (
            <p key={m.name} className="text-sm text-warmstone-600 truncate">
              {m.name}{m.dosage ? ` ${m.dosage}` : ""}
            </p>
          ))}
          {activeMedications.length === 0 && (
            <p className="text-sm text-warmstone-400">None recorded</p>
          )}
          <p className="text-xs text-honey-600 font-semibold mt-3">View all medications</p>
        </Card>
      </Link>

      <Link href={`${baseUrl}/allergies`}>
        <Card hoverable clickable className="p-5 h-full">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={18} className={allergies && allergies.length > 0 ? "text-error" : "text-sage-400"} />
            <h2 className="font-bold text-warmstone-900">Allergies</h2>
          </div>
          {allergies && allergies.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-warmstone-900 mb-2">{allergies.length}</p>
              {allergies.map((a) => (
                <p key={a.name} className="text-sm text-warmstone-600 truncate">{a.name}</p>
              ))}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-sage-400" />
              <p className="text-sm text-sage-600 font-semibold">No known allergies</p>
            </div>
          )}
          <p className="text-xs text-honey-600 font-semibold mt-3">View all allergies</p>
        </Card>
      </Link>

      <Link href={`${baseUrl}/appointments`}>
        <Card hoverable clickable className="p-5 h-full">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-honey-600" />
            <h2 className="font-bold text-warmstone-900">Appointments</h2>
          </div>
          {nextAppointment ? (
            <>
              <p className="text-sm font-bold text-warmstone-900 truncate">{nextAppointment.title}</p>
              <p className="text-sm text-warmstone-600">{formatDateTime(nextAppointment.appointment_date)}</p>
              {nextAppointment.location && (
                <p className="text-sm text-warmstone-400 truncate">{nextAppointment.location}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-warmstone-400">No upcoming appointments</p>
          )}
          <p className="text-xs text-honey-600 font-semibold mt-3">View all appointments</p>
        </Card>
      </Link>

      <Link href={`${baseUrl}/documents`} className="md:col-span-2">
        <Card hoverable clickable className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-honey-600" />
            <h2 className="font-bold text-warmstone-900">Documents</h2>
          </div>
          <p className="text-2xl font-bold text-warmstone-900">{documents?.length ?? 0}</p>
          <p className="text-xs text-honey-600 font-semibold mt-3">View all documents</p>
        </Card>
      </Link>
    </div>
    </div>
  );
}
