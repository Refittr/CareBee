import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { svc } = auth;
  const { userId } = await params;

  // Wave 1: all independent queries in parallel
  const [householdsRes, aiLogRes, pageViewCountRes, featureUsageRes, docsRes] =
    await Promise.all([
      svc
        .from("households")
        .select("id, name, created_at, subscription_status, trial_ends_at")
        .eq("created_by", userId)
        .order("created_at", { ascending: true }),
      svc
        .from("api_usage_log")
        .select("feature, action, created_at, tokens_used")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      svc
        .from("page_view_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      svc
        .from("feature_usage_log")
        .select("feature, action, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500),
      svc
        .from("documents")
        .select("id, person_id, document_type, description, created_at")
        .eq("uploaded_by", userId)
        .order("created_at", { ascending: true }),
    ]);

  const households = householdsRes.data ?? [];
  const householdIds = households.map((h) => h.id as string);

  // Wave 2: needs householdIds
  const [peopleRes, membersRes] = await Promise.all([
    householdIds.length > 0
      ? svc
          .from("people")
          .select("id, first_name, last_name, created_at, household_id")
          .in("household_id", householdIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string | null; created_at: string; household_id: string }[] }),
    householdIds.length > 0
      ? svc
          .from("household_members")
          .select("household_id, role, accepted_at, user_id")
          .in("household_id", householdIds)
          .neq("user_id", userId)
      : Promise.resolve({ data: [] as { household_id: string; role: string; accepted_at: string | null; user_id: string }[] }),
  ]);

  const allPeople = peopleRes.data ?? [];
  const peopleIds = allPeople.map((p) => p.id as string);

  // Wave 3: per-person stats
  const [condsRes, medsRes, apptsRes, notesRes, testsRes] = await Promise.all([
    peopleIds.length > 0
      ? svc.from("conditions").select("person_id").in("person_id", peopleIds)
      : Promise.resolve({ data: [] as { person_id: string }[] }),
    peopleIds.length > 0
      ? svc.from("medications").select("person_id").in("person_id", peopleIds)
      : Promise.resolve({ data: [] as { person_id: string }[] }),
    peopleIds.length > 0
      ? svc.from("appointments").select("person_id").in("person_id", peopleIds)
      : Promise.resolve({ data: [] as { person_id: string }[] }),
    peopleIds.length > 0
      ? svc.from("care_notes").select("person_id").in("person_id", peopleIds)
      : Promise.resolve({ data: [] as { person_id: string }[] }),
    peopleIds.length > 0
      ? svc.from("test_results").select("person_id").in("person_id", peopleIds)
      : Promise.resolve({ data: [] as { person_id: string }[] }),
  ]);

  function byPerson(rows: { person_id: string }[] | null) {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.person_id, (m.get(r.person_id) ?? 0) + 1);
    return m;
  }

  const condsByP = byPerson(condsRes.data);
  const medsByP = byPerson(medsRes.data);
  const apptsByP = byPerson(apptsRes.data);
  const notesByP = byPerson(notesRes.data);
  const testsByP = byPerson(testsRes.data);

  const allDocs = docsRes.data ?? [];
  const docsByP = byPerson(allDocs.map((d) => ({ person_id: d.person_id as string })));
  const members = membersRes.data ?? [];

  const enrichedHouseholds = households.map((h) => ({
    id: h.id as string,
    name: h.name as string,
    created_at: h.created_at as string,
    subscription_status: h.subscription_status as string,
    trial_ends_at: (h.trial_ends_at as string | null) ?? null,
    people: allPeople
      .filter((p) => p.household_id === h.id)
      .map((p) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name ?? null,
        created_at: p.created_at,
        conditions_count: condsByP.get(p.id) ?? 0,
        medications_count: medsByP.get(p.id) ?? 0,
        appointments_count: apptsByP.get(p.id) ?? 0,
        care_notes_count: notesByP.get(p.id) ?? 0,
        test_results_count: testsByP.get(p.id) ?? 0,
        documents_count: docsByP.get(p.id) ?? 0,
      })),
    members: members
      .filter((m) => m.household_id === h.id)
      .map((m) => ({
        role: m.role,
        accepted_at: m.accepted_at ?? null,
        user_id: m.user_id,
      })),
  }));

  const docByType: Record<string, number> = {};
  for (const d of allDocs) {
    const t = (d.document_type as string) ?? "other";
    docByType[t] = (docByType[t] ?? 0) + 1;
  }

  const aiLog = aiLogRes.data ?? [];
  const aiByFeature: Record<string, number> = {};
  for (const a of aiLog) {
    const f = (a.feature as string) ?? "unknown";
    aiByFeature[f] = (aiByFeature[f] ?? 0) + 1;
  }

  const featureLog = featureUsageRes.data ?? [];
  const featureByName: Record<string, number> = {};
  for (const f of featureLog) {
    const name = (f.feature as string) ?? "unknown";
    featureByName[name] = (featureByName[name] ?? 0) + 1;
  }

  return NextResponse.json({
    households: enrichedHouseholds,
    total_people: allPeople.length,
    documents: {
      total: allDocs.length,
      with_ai: allDocs.filter((d) => d.description).length,
      first_upload: allDocs[0]?.created_at ?? null,
      last_upload: allDocs[allDocs.length - 1]?.created_at ?? null,
      by_type: docByType,
    },
    ai_calls: {
      total: aiLog.length,
      by_feature: aiByFeature,
      first_at: aiLog.length > 0 ? aiLog[aiLog.length - 1].created_at : null,
      last_at: aiLog.length > 0 ? aiLog[0].created_at : null,
    },
    feature_usage: {
      total: featureLog.length,
      by_feature: featureByName,
    },
    page_views: pageViewCountRes.count ?? 0,
  });
}
