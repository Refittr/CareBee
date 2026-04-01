import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendar | CareBee" };

type Props = { params: Promise<{ householdId: string }> };

export default async function CalendarPage({ params }: Props) {
  const { householdId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <CalendarPageClient householdId={householdId} />;
}
