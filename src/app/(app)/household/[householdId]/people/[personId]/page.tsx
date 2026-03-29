import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { HeartPulse, Pill, ShieldCheck, Calendar, FileText, FlaskConical, AlertTriangle, Sparkles } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ScanDocumentButton } from "@/components/scan/ScanDocumentButton";
import { formatDateUK } from "@/lib/utils/dates";
import { getLabels } from "@/lib/labels";
import { DailyCareEnableCard } from "./DailyCareEnableCard";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import type { Metadata } from "next";
import type { UserType } from "@/lib/types/database";

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
  const svc = await createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: person },
    { data: profileData },
    { data: conditions },
    { data: medications },
    { data: allergies },
    { data: appointments },
    { data: testResults },
    { data: documents },
    { data: insights },
    { data: openFollowUps },
  ] = await Promise.all([
    supabase.from("people").select("*").eq("id", personId).single(),
    supabase.from("profiles").select("user_type, onboarding_dismissed").eq("id", user.id).maybeSingle(),
    supabase.from("conditions").select("name, is_active").eq("person_id", personId).order("created_at"),
    supabase.from("medications").select("name, dosage, is_active").eq("person_id", personId).order("created_at"),
    supabase.from("allergies").select("name").eq("person_id", personId),
    supabase.from("appointments").select("id, title, appointment_date, location, department, status").eq("person_id", personId).eq("status", "upcoming").gte("appointment_date", new Date().toISOString()).order("appointment_date", { ascending: true }).limit(5),
    supabase.from("test_results").select("test_name, result_value, result_date, is_abnormal").eq("person_id", personId).order("result_date", { ascending: false, nullsFirst: false }).limit(3),
    supabase.from("documents").select("id", { count: "exact" }).eq("person_id", personId),
    supabase.from("health_insights").select("title, priority").eq("person_id", personId).eq("status", "active").order("created_at", { ascending: false }).limit(5),
    svc.from("daily_care_records").select("id, record_date, shift, concerns").eq("person_id", personId).eq("follow_up_needed", true).eq("follow_up_resolved", false).order("record_date", { ascending: false }).limit(10),
  ]);

  if (!person) notFound();

  const userType = (profileData?.user_type as UserType | null) ?? null;
  const labels = getLabels(userType);

  const baseUrl = `/household/${householdId}/people/${personId}`;
  const activeConditions = conditions?.filter((c) => c.is_active) ?? [];
  const activeMedications = medications?.filter((m) => m.is_active) ?? [];
  const upcomingAppts = appointments ?? [];
  const openFollowUpCount = openFollowUps?.length ?? 0;

  const showChecklist = userType === "self_care" && !profileData?.onboarding_dismissed;

  return (
    <div className="flex flex-col gap-4">

      {showChecklist && (
        <OnboardingChecklist
          userType="self_care"
          householdId={householdId}
          personId={personId}
        />
      )}

      {/* Follow-up alert */}
      {openFollowUpCount > 0 && (
        <Link href={`${baseUrl}/daily-care`}>
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 hover:bg-red-100 transition-colors">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                {openFollowUpCount} open follow-up{openFollowUpCount !== 1 ? "s" : ""} need attention
              </p>
              {openFollowUps && openFollowUps[0]?.concerns && (
                <p className="text-xs text-red-700 mt-0.5 line-clamp-1">{openFollowUps[0].concerns}</p>
              )}
            </div>
            <span className="text-xs font-semibold text-red-600 shrink-0">View →</span>
          </div>
        </Link>
      )}

      {/* AI Scan — full-width long button */}
      <ScanDocumentButton householdId={householdId} personId={personId} />

      {/* All summary cards — 2-col grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Health insights */}
        <Link href={`${baseUrl}/insights`} className="block h-full">
          <Card
            hoverable
            clickable
            className={[
              "p-4 h-full",
              insights && insights.length > 0 ? "border-honey-300 bg-honey-50" : "border-warmstone-200",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className={insights && insights.length > 0 ? "text-honey-600" : "text-warmstone-400"} />
                <h2 className="font-bold text-warmstone-900">Health insights</h2>
                {insights && insights.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-honey-400 text-white text-xs font-bold">
                    {insights.length}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-honey-700">
                {insights && insights.length > 0 ? "Review →" : "Run →"}
              </span>
            </div>
            {insights && insights.length > 0 ? (
              <div className="flex flex-col gap-2">
                {insights.slice(0, 3).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className={[
                      "mt-1.5 shrink-0 w-2 h-2 rounded-full",
                      insight.priority === "urgent" ? "bg-red-500" :
                      insight.priority === "important" ? "bg-honey-500" :
                      "bg-sage-400",
                    ].join(" ")} />
                    <p className="text-sm text-warmstone-800 leading-snug line-clamp-2">{insight.title}</p>
                  </div>
                ))}
                {insights.length > 3 && (
                  <p className="text-xs text-warmstone-500 ml-4">+{insights.length - 3} more</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-warmstone-500 leading-relaxed">
                {labels.personInsightDescription.replace("{firstName}", person.first_name)}
              </p>
            )}
          </Card>
        </Link>

        {/* Conditions */}
        <Link href={`${baseUrl}/conditions`} className="block h-full">
          <Card hoverable clickable className="p-5 h-full">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse size={18} className="text-honey-600" />
              <h2 className="font-bold text-warmstone-900">{labels.personConditionsHeading}</h2>
            </div>
            <p className="text-2xl font-bold text-warmstone-900 mb-2">{activeConditions.length}</p>
            {activeConditions.slice(0, 3).map((c) => (
              <p key={c.name} className="text-sm text-warmstone-600 truncate">{c.name}</p>
            ))}
            {activeConditions.length === 0 && (
              <p className="text-sm text-warmstone-400">None recorded</p>
            )}
            <p className="text-xs text-honey-600 font-semibold mt-3">View all →</p>
          </Card>
        </Link>

        {/* Medications */}
        <Link href={`${baseUrl}/medications`} className="block h-full">
          <Card hoverable clickable className="p-5 h-full">
            <div className="flex items-center gap-2 mb-3">
              <Pill size={18} className="text-honey-600" />
              <h2 className="font-bold text-warmstone-900">{labels.personMedicationsHeading}</h2>
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
            <p className="text-xs text-honey-600 font-semibold mt-3">View all →</p>
          </Card>
        </Link>

        {/* Allergies */}
        <Link href={`${baseUrl}/allergies`} className="block h-full">
          <Card hoverable clickable className="p-5 h-full">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className={allergies && allergies.length > 0 ? "text-error" : "text-sage-400"} />
              <h2 className="font-bold text-warmstone-900">{labels.personAllergiesHeading}</h2>
            </div>
            {allergies && allergies.length > 0 ? (
              <>
                <p className="text-2xl font-bold text-warmstone-900 mb-2">{allergies.length}</p>
                {allergies.slice(0, 3).map((a) => (
                  <p key={a.name} className="text-sm text-warmstone-600 truncate">{a.name}</p>
                ))}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-sage-400" />
                <p className="text-sm text-sage-600 font-semibold">No known allergies</p>
              </div>
            )}
            <p className="text-xs text-honey-600 font-semibold mt-3">View all →</p>
          </Card>
        </Link>

        {/* Appointments */}
        <Link href={`${baseUrl}/appointments`} className="block h-full">
          <Card hoverable clickable className="p-5 h-full">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-honey-600" />
              <h2 className="font-bold text-warmstone-900">{labels.personAppointmentsHeading}</h2>
            </div>
            {upcomingAppts.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {upcomingAppts.map((appt) => {
                  const d = new Date(appt.appointment_date);
                  const day = d.toLocaleDateString("en-GB", { day: "numeric" });
                  const month = d.toLocaleDateString("en-GB", { month: "short" });
                  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div key={appt.id} className="flex-none w-[108px] bg-warmstone-white rounded-lg overflow-hidden border border-warmstone-100 flex flex-col">
                      <div className="h-0.5 bg-honey-400 w-full" />
                      <div className="px-2 pt-2 pb-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <Calendar size={12} className="text-honey-500" />
                          {isToday && <span className="text-[9px] font-bold uppercase tracking-wide bg-honey-100 text-honey-700 px-1 py-0.5 rounded-full">Today</span>}
                        </div>
                        <p className="text-[10px] font-semibold text-honey-600">{day} {month} · {time}</p>
                        <p className="text-xs font-bold text-warmstone-900 leading-snug line-clamp-2">{appt.title}</p>
                        {(appt.department || appt.location) && (
                          <p className="text-[10px] text-warmstone-400 truncate">{appt.department ?? appt.location}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-warmstone-400">No upcoming appointments</p>
            )}
            <p className="text-xs text-honey-600 font-semibold mt-3">View all →</p>
          </Card>
        </Link>

        {/* Test results */}
        <Link href={`${baseUrl}/test-results`} className="block h-full">
          <Card hoverable clickable className="p-5 h-full">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={18} className="text-honey-600" />
              <h2 className="font-bold text-warmstone-900">{labels.personTestResultsHeading}</h2>
            </div>
            {testResults && testResults.length > 0 ? (
              <>
                <p className="text-2xl font-bold text-warmstone-900 mb-2">{testResults.length}</p>
                {testResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    {r.is_abnormal && <AlertTriangle size={12} className="text-error shrink-0" />}
                    <p className="text-sm text-warmstone-600 truncate">
                      {r.test_name}
                      {r.result_value ? `: ${r.result_value}` : ""}
                      {r.result_date ? ` (${formatDateUK(r.result_date)})` : ""}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-warmstone-400">None recorded</p>
            )}
            <p className="text-xs text-honey-600 font-semibold mt-3">View all →</p>
          </Card>
        </Link>

        {/* Documents */}
        <Link href={`${baseUrl}/documents`} className="block h-full">
          <Card hoverable clickable className="p-5 h-full">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-honey-600" />
              <h2 className="font-bold text-warmstone-900">{labels.personDocumentsHeading}</h2>
            </div>
            <p className="text-2xl font-bold text-warmstone-900">{documents?.length ?? 0}</p>
            <p className="text-xs text-honey-600 font-semibold mt-3">View all →</p>
          </Card>
        </Link>

        {/* Daily care */}
        <DailyCareEnableCard
          personId={personId}
          householdId={householdId}
          firstName={person.first_name}
          enabled={person.daily_care_enabled ?? false}
          baseUrl={baseUrl}
          openFollowUpCount={openFollowUpCount}
        />

      </div>
    </div>
  );
}
