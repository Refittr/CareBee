import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { HeartPulse, Pill, ShieldCheck, Calendar, FileText, FlaskConical, AlertTriangle, Sparkles } from "lucide-react";
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

  const [{ data: person }, { data: conditions }, { data: medications }, { data: allergies }, { data: appointments }, { data: testResults }, { data: documents }, { data: insights }] =
    await Promise.all([
      supabase.from("people").select("*").eq("id", personId).single(),
      supabase.from("conditions").select("name, is_active").eq("person_id", personId).order("created_at"),
      supabase.from("medications").select("name, dosage, is_active").eq("person_id", personId).order("created_at"),
      supabase.from("allergies").select("name").eq("person_id", personId),
      supabase.from("appointments").select("id, title, appointment_date, location, department, status").eq("person_id", personId).eq("status", "upcoming").gte("appointment_date", new Date().toISOString()).order("appointment_date", { ascending: true }).limit(5),
      supabase.from("test_results").select("test_name, result_value, result_date, is_abnormal").eq("person_id", personId).order("result_date", { ascending: false, nullsFirst: false }).limit(3),
      supabase.from("documents").select("id", { count: "exact" }).eq("person_id", personId),
      supabase.from("health_insights").select("title, priority").eq("person_id", personId).eq("status", "active").order("created_at", { ascending: false }).limit(5),
    ]);

  if (!person) notFound();

  const baseUrl = `/household/${householdId}/people/${personId}`;
  const activeConditions = conditions?.filter((c) => c.is_active) ?? [];
  const activeMedications = medications?.filter((m) => m.is_active) ?? [];
  const upcomingAppts = appointments ?? [];

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
          {upcomingAppts.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {upcomingAppts.map((appt, i) => {
                const d = new Date(appt.appointment_date);
                const day = d.toLocaleDateString("en-GB", { day: "numeric" });
                const month = d.toLocaleDateString("en-GB", { month: "short" });
                const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                const isToday = d.toDateString() === new Date().toDateString();
                const palette = ["bg-honey-400", "bg-sage-500", "bg-blue-500", "bg-rose-400"] as const;
                const headerBg = isToday ? "bg-honey-600" : palette[i % palette.length];
                return (
                  <div key={appt.id} className="flex-none w-[110px] rounded-lg overflow-hidden border border-warmstone-100 flex flex-col">
                    <div className={`${headerBg} px-2 py-1.5 flex items-center justify-between`}>
                      <span className="text-base font-black text-white leading-none">{day}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white opacity-80">{month}</span>
                    </div>
                    <div className="px-2 py-2 flex flex-col gap-0.5">
                      <p className="text-[10px] font-semibold text-warmstone-400">{time}</p>
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
          <p className="text-xs text-honey-600 font-semibold mt-3">View all appointments</p>
        </Card>
      </Link>

      <Link href={`${baseUrl}/insights`} className="md:col-span-2">
        <Card
          hoverable
          clickable
          className={[
            "p-5",
            insights && insights.length > 0 ? "border-honey-300 bg-honey-50" : "",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className={insights && insights.length > 0 ? "text-honey-600" : "text-warmstone-400"} />
              <h2 className="font-bold text-warmstone-900">Health insights</h2>
            </div>
            {insights && insights.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-honey-400 text-white text-xs font-bold">
                {insights.length}
              </span>
            )}
          </div>
          {insights && insights.length > 0 ? (
            <>
              {insights.slice(0, 3).map((insight, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className={[
                    "mt-1 shrink-0 w-1.5 h-1.5 rounded-full",
                    insight.priority === "urgent" ? "bg-red-500" :
                    insight.priority === "important" ? "bg-honey-500" :
                    "bg-sage-400",
                  ].join(" ")} />
                  <p className="text-sm text-warmstone-800 leading-snug">{insight.title}</p>
                </div>
              ))}
              {insights.length > 3 && (
                <p className="text-xs text-warmstone-500 mt-1">+{insights.length - 3} more</p>
              )}
              <p className="text-xs text-honey-700 font-semibold mt-3">Review all insights</p>
            </>
          ) : (
            <>
              <p className="text-sm text-warmstone-400">No active insights</p>
              <p className="text-xs text-honey-600 font-semibold mt-3">Run an insight check</p>
            </>
          )}
        </Card>
      </Link>

      <Link href={`${baseUrl}/test-results`} className="md:col-span-2">
        <Card hoverable clickable className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical size={18} className="text-honey-600" />
            <h2 className="font-bold text-warmstone-900">Test Results</h2>
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
          <p className="text-xs text-honey-600 font-semibold mt-3">View all test results</p>
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
