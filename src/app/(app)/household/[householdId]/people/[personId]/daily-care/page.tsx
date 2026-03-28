import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { DailyCareClient } from "./DailyCareClient";
import type { DailyCareRecord } from "@/lib/types/database";

type Props = {
  params: Promise<{ householdId: string; personId: string }>;
};

export default async function DailyCarePage({ params }: Props) {
  const { householdId, personId } = await params;
  const svc = await createServiceClient();

  const { data: person } = await svc
    .from("people")
    .select("id, first_name, last_name, daily_care_enabled")
    .eq("id", personId)
    .maybeSingle();

  if (!person || !person.daily_care_enabled) notFound();

  const { data: records, count } = await svc
    .from("daily_care_records")
    .select("*, profiles!recorded_by(full_name)", { count: "exact" })
    .eq("person_id", personId)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, 19);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped: DailyCareRecord[] = (records ?? []).map((r: any) => ({
    ...r,
    recorded_by_name: r.profiles?.full_name ?? null,
    profiles: undefined,
  }));

  return (
    <DailyCareClient
      person={person as { id: string; first_name: string; last_name: string; daily_care_enabled: boolean }}
      householdId={householdId}
      initialRecords={mapped}
      initialTotal={count ?? 0}
    />
  );
}
