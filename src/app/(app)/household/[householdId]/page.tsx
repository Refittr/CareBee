import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Plus, AlertTriangle, Calendar } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { getInitials } from "@/lib/utils/formatting";
import { calculateAge } from "@/lib/utils/dates";
import type { Metadata } from "next";
import type { Person } from "@/lib/types/database";

type Props = { params: Promise<{ householdId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { householdId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("households").select("name").eq("id", householdId).single();
  return { title: `${data?.name ?? "Care record"} | CareBee` };
}

export default async function HouseholdPage({ params }: Props) {
  const { householdId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .single();
  if (!household) notFound();

  const svc = await createServiceClient();

  const now = new Date().toISOString();

  const [{ data: people }, { data: rawMembers }, { data: conditions }, { data: medications }, { data: allergies }, { data: interactions }, { data: upcomingAppointments }] =
    await Promise.all([
      supabase.from("people").select("*").eq("household_id", householdId),
      svc.from("household_members").select("*").eq("household_id", householdId),
      supabase.from("conditions").select("person_id, is_active").eq("household_id", householdId).eq("is_active", true),
      supabase.from("medications").select("person_id, is_active").eq("household_id", householdId).eq("is_active", true),
      supabase.from("allergies").select("person_id").eq("household_id", householdId),
      supabase.from("drug_interactions").select("person_id, severity").eq("household_id", householdId).eq("status", "active"),
      supabase
        .from("appointments")
        .select("id, person_id, title, appointment_date, location, department, professional_name")
        .eq("household_id", householdId)
        .eq("status", "upcoming")
        .gte("appointment_date", now)
        .order("appointment_date", { ascending: true })
        .limit(10),
    ]);

  const memberUserIds = (rawMembers ?? []).map((m) => m.user_id as string).filter(Boolean);
  const { data: memberProfiles } = memberUserIds.length
    ? await svc.from("profiles").select("id, full_name, email, avatar_url").in("id", memberUserIds)
    : { data: [] };
  const profileMap = new Map((memberProfiles ?? []).map((p) => [p.id, p]));
  const members = (rawMembers ?? []).map((m) => ({
    ...m,
    profiles: profileMap.get(m.user_id as string) ?? null,
  }));

  const peopleMap = new Map((people ?? []).map((p) => [p.id, p]));

  function getPersonStats(personId: string) {
    const personInteractions = interactions?.filter((i) => i.person_id === personId) ?? [];
    const hasSevereInteraction = personInteractions.some((i) => i.severity === "severe");
    const hasModerateInteraction = personInteractions.some((i) => i.severity === "moderate");
    return {
      conditionCount: conditions?.filter((c) => c.person_id === personId).length ?? 0,
      medicationCount: medications?.filter((m) => m.person_id === personId).length ?? 0,
      hasAllergies: (allergies?.filter((a) => a.person_id === personId).length ?? 0) > 0,
      interactionCount: personInteractions.length,
      hasSevereInteraction,
      hasModerateInteraction,
    };
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl">
      <Header title={household.name} showBack backHref="/dashboard" />
      <Breadcrumbs
        items={[
          { label: "Your care records", href: "/dashboard" },
          { label: household.name },
        ]}
      />
      <h1 className="text-2xl font-bold text-warmstone-900 mb-6 hidden md:block">{household.name}</h1>

      {upcomingAppointments && upcomingAppointments.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-warmstone-900">Upcoming appointments</h2>
            <span className="text-xs text-warmstone-400">{upcomingAppointments.length} scheduled</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
            {upcomingAppointments.map((appt, i) => {
              const person = peopleMap.get(appt.person_id);
              const d = new Date(appt.appointment_date);
              const day = d.toLocaleDateString("en-GB", { day: "numeric" });
              const month = d.toLocaleDateString("en-GB", { month: "short" });
              const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
              const isToday = d.toDateString() === new Date().toDateString();
              const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
              const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : null;

              const palette = [
                { card: "bg-honey-50 border-honey-200 hover:border-honey-300", dateBg: "bg-honey-400", dateText: "text-warmstone-white", meta: "text-honey-700" },
                { card: "bg-sage-50 border-sage-200 hover:border-sage-300", dateBg: "bg-sage-500", dateText: "text-warmstone-white", meta: "text-sage-700" },
                { card: "bg-blue-50 border-blue-200 hover:border-blue-300", dateBg: "bg-blue-500", dateText: "text-white", meta: "text-blue-700" },
                { card: "bg-rose-50 border-rose-200 hover:border-rose-300", dateBg: "bg-rose-400", dateText: "text-white", meta: "text-rose-700" },
              ] as const;
              const colors = isToday
                ? { card: "bg-honey-400 border-honey-500 hover:border-honey-600", dateBg: "bg-honey-600", dateText: "text-warmstone-white", meta: "text-honey-100" }
                : palette[i % palette.length];

              return (
                <Link
                  key={appt.id}
                  href={`/household/${householdId}/people/${appt.person_id}/appointments`}
                  className={`flex-none w-[148px] border rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col ${colors.card}`}
                >
                  <div className={`${colors.dateBg} px-3 py-2.5 flex items-center justify-between gap-2`}>
                    <span className={`text-lg font-black leading-none ${colors.dateText}`}>{day}</span>
                    <span className={`text-xs font-bold uppercase tracking-wide ${colors.dateText} opacity-80`}>{month}</span>
                  </div>
                  <div className="px-3 py-2.5 flex flex-col gap-1 min-w-0">
                    <p className={`text-[11px] font-bold ${colors.meta}`}>
                      {dayLabel ? `${dayLabel} · ${time}` : time}
                    </p>
                    <p className={`text-sm font-bold leading-snug line-clamp-2 ${isToday ? "text-warmstone-white" : "text-warmstone-900"}`}>{appt.title}</p>
                    {person && (
                      <p className={`text-xs truncate ${isToday ? "text-honey-100" : "text-warmstone-500"}`}>{person.first_name}</p>
                    )}
                    {(appt.department || appt.location) && (
                      <p className={`text-xs truncate ${isToday ? "text-honey-100" : "text-warmstone-400"}`}>{appt.department ?? appt.location}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-warmstone-900">People</h2>
          <Link
            href={`/household/${householdId}/people/new`}
            className="text-sm font-semibold text-honey-600 hover:text-honey-800 transition-colors flex items-center gap-1 min-h-[44px]"
          >
            <Plus size={16} /> Add person
          </Link>
        </div>

        {people && people.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {people.map((person: Person) => {
              const age = calculateAge(person.date_of_birth);
              const { conditionCount, medicationCount, hasAllergies, interactionCount, hasSevereInteraction, hasModerateInteraction } = getPersonStats(person.id);
              return (
                <Link
                  key={person.id}
                  href={`/household/${householdId}/people/${person.id}`}
                  className="bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-honey-100 flex items-center justify-center text-honey-800 font-bold text-sm shrink-0">
                      {getInitials(`${person.first_name} ${person.last_name}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-warmstone-900 truncate">
                          {person.first_name} {person.last_name}
                        </h3>
                        {hasAllergies && (
                          <AlertTriangle size={14} className="text-error shrink-0" />
                        )}
                      </div>
                      {age !== null && (
                        <p className="text-sm text-warmstone-600">{age} years old</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-warmstone-600">
                        <span>{conditionCount} condition{conditionCount !== 1 ? "s" : ""}</span>
                        <span>{medicationCount} medication{medicationCount !== 1 ? "s" : ""}</span>
                      </div>
                      {interactionCount > 0 && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${hasSevereInteraction ? "text-error" : "text-honey-700"}`}>
                          <AlertTriangle size={12} />
                          {interactionCount} drug interaction{interactionCount !== 1 ? "s" : ""} flagged
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}

            <Link
              href={`/household/${householdId}/people/new`}
              className="bg-warmstone-50 border border-dashed border-warmstone-200 rounded-lg p-5 hover:bg-warmstone-100 transition-colors flex flex-col items-center justify-center gap-2 text-center min-h-[100px]"
            >
              <Plus size={20} className="text-warmstone-400" />
              <span className="text-sm font-semibold text-warmstone-600">Add someone you care for</span>
            </Link>
          </div>
        ) : (
          <div className="bg-warmstone-50 border border-dashed border-warmstone-200 rounded-lg p-8 text-center">
            <p className="text-warmstone-600 text-sm mb-3">No one added yet.</p>
            <Link
              href={`/household/${householdId}/people/new`}
              className="bg-honey-400 text-warmstone-white font-bold rounded-md px-5 py-2.5 text-sm hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] inline-flex items-center gap-2"
            >
              <Plus size={16} /> Add first person
            </Link>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-warmstone-900">Members</h2>
          <Link
            href={`/household/${householdId}/invite`}
            className="text-sm font-semibold text-honey-600 hover:text-honey-800 transition-colors flex items-center gap-1 min-h-[44px]"
          >
            <Plus size={16} /> Invite
          </Link>
        </div>

        <div className="flex flex-wrap gap-4">
          {members?.map((member) => {
            const profile = (member as unknown as { profiles: { full_name: string; email: string; avatar_url: string | null } | null }).profiles;
            const name = profile?.full_name ?? member.invited_email ?? "Unknown";
            return (
              <Link
                key={member.id}
                href={`/household/${householdId}/members`}
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center text-sage-800 font-bold text-sm">
                  {getInitials(name)}
                </div>
                <span className="text-xs text-warmstone-800 font-semibold max-w-[64px] truncate">{name.split(" ")[0]}</span>
                <Badge variant={member.role === "owner" ? "owner" : member.role === "editor" ? "active" : "neutral"}>
                  {member.role}
                </Badge>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
