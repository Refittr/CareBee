import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";

type Props = {
  params: Promise<{ householdId: string; personId: string }>;
};

export default async function PersonCalendarPage({ params }: Props) {
  const { householdId, personId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify membership
  const { data: membership } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  return (
    <CalendarPageClient
      householdId={householdId}
      personId={personId}
    />
  );
}
