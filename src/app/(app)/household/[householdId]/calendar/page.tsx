import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendar | CareBee" };

type Props = { params: Promise<{ householdId: string }> };

export default async function CalendarPage({ params }: Props) {
  const { householdId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all households the user belongs to so the calendar can show
  // people from every care record they have access to (carer mode)
  const { data: memberships } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id);

  const allHouseholdIds = memberships
    ? memberships.map((m) => m.household_id as string)
    : [householdId];

  // Ensure the current household is first in the list
  const ordered = [
    householdId,
    ...allHouseholdIds.filter((id) => id !== householdId),
  ];

  return <CalendarPageClient householdId={householdId} allHouseholdIds={ordered} />;
}
