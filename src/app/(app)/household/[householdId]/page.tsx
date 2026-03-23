import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Plus, AlertTriangle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { getInitials } from "@/lib/utils/formatting";
import { calculateAge } from "@/lib/utils/dates";
import type { Metadata } from "next";
import type { Person, HouseholdMember } from "@/lib/types/database";

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

  const [{ data: people }, { data: members }, { data: conditions }, { data: medications }, { data: allergies }] =
    await Promise.all([
      supabase.from("people").select("*").eq("household_id", householdId),
      supabase
        .from("household_members")
        .select("*, profiles(full_name, email, avatar_url)")
        .eq("household_id", householdId),
      supabase.from("conditions").select("person_id, is_active").eq("household_id", householdId).eq("is_active", true),
      supabase.from("medications").select("person_id, is_active").eq("household_id", householdId).eq("is_active", true),
      supabase.from("allergies").select("person_id").eq("household_id", householdId),
    ]);

  function getPersonStats(personId: string) {
    return {
      conditionCount: conditions?.filter((c) => c.person_id === personId).length ?? 0,
      medicationCount: medications?.filter((m) => m.person_id === personId).length ?? 0,
      hasAllergies: (allergies?.filter((a) => a.person_id === personId).length ?? 0) > 0,
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
              const { conditionCount, medicationCount, hasAllergies } = getPersonStats(person.id);
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
