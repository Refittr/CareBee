import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { calculateAge } from "@/lib/utils/dates";
import { formatNHSNumber } from "@/lib/utils/formatting";
import { PersonActions } from "./PersonActions";
import { PersonTabs } from "./PersonTabs";
import { RoleProvider } from "@/lib/context/role";
import type { MemberRole } from "@/lib/types/database";

type Props = {
  children: React.ReactNode;
  params: Promise<{ householdId: string; personId: string }>;
};


export default async function PersonLayout({ children, params }: Props) {
  const { householdId, personId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: person }, { data: household }, { data: membership }] = await Promise.all([
    supabase.from("people").select("*").eq("id", personId).single(),
    supabase.from("households").select("name").eq("id", householdId).single(),
    supabase.from("household_members").select("role").eq("household_id", householdId).eq("user_id", user.id).maybeSingle(),
  ]);

  if (!person || !household) notFound();

  const role = (membership?.role ?? "viewer") as MemberRole;

  const age = calculateAge(person.date_of_birth);
  const baseUrl = `/household/${householdId}/people/${personId}`;

  return (
    <div className="max-w-4xl">
      <Header
        title={`${person.first_name} ${person.last_name}`}
        showBack
        backHref={`/household/${householdId}`}
      />
      <div className="px-4 md:px-8 pt-3">
        <Breadcrumbs
          items={[
            { label: "Your care records", href: "/dashboard" },
            { label: household.name, href: `/household/${householdId}` },
            { label: `${person.first_name} ${person.last_name}` },
          ]}
        />
      </div>

      <div className="px-4 md:px-8 pt-2 pb-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-warmstone-900 leading-tight">
              {person.first_name} {person.last_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-warmstone-600">
              {age !== null && <span>{age} years old</span>}
              {person.nhs_number && (
                <span>NHS: {formatNHSNumber(person.nhs_number)}</span>
              )}
              {person.gp_surgery && <span>{person.gp_surgery}</span>}
            </div>
          </div>
          <PersonActions householdId={householdId} personId={personId} person={person} canEdit={role === "owner" || role === "editor"} />
        </div>

        <PersonTabs baseUrl={baseUrl} />
      </div>

      <div className="px-4 md:px-8 pt-4 pb-8">
        <RoleProvider role={role}>
          {children}
        </RoleProvider>
      </div>
    </div>
  );
}

