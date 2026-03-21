import { notFound } from "next/navigation";
import { ShieldOff, AlertTriangle, Bug } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateUK, calculateAge } from "@/lib/utils/dates";
import { formatNHSNumber } from "@/lib/utils/formatting";
import type { Metadata } from "next";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: "Emergency Info | CareBee", robots: { index: false } };
}

export default async function EmergencyPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: share } = await supabase
    .from("emergency_shares")
    .select("*, people(*)")
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle();

  const now = new Date().toISOString();
  const isExpired = share?.expires_at && share.expires_at < now;

  if (!share || isExpired) {
    return (
      <div className="min-h-screen bg-warmstone-white flex flex-col items-center justify-center px-6 text-center gap-4">
        <ShieldOff size={48} className="text-warmstone-400" strokeWidth={1.5} />
        <h1 className="text-xl font-bold text-warmstone-900">This link is no longer active</h1>
        <p className="text-warmstone-600 text-sm max-w-xs">
          This emergency summary has been deactivated or has expired. Contact the person who shared it with you.
        </p>
      </div>
    );
  }

  const person = share.people as {
    first_name: string; last_name: string; date_of_birth: string | null;
    nhs_number: string | null; gp_surgery: string | null; gp_name: string | null;
    next_of_kin_name: string | null; next_of_kin_phone: string | null; next_of_kin_relationship: string | null;
    dnacpr_status: boolean; updated_at: string;
  };

  const personId = share.person_id;

  const [{ data: conditions }, { data: medications }, { data: allergies }] = await Promise.all([
    supabase.from("conditions").select("name").eq("person_id", personId).eq("is_active", true),
    supabase.from("medications").select("name, dosage, frequency").eq("person_id", personId).eq("is_active", true),
    supabase.from("allergies").select("name, severity, reaction").eq("person_id", personId),
  ]);

  const age = calculateAge(person.date_of_birth);
  const fullName = `${person.first_name} ${person.last_name}`;

  return (
    <>
      <style>{`
        @media print {
          nav, footer, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { page-break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-warmstone-50 print:bg-white">
        <header style={{ background: "linear-gradient(135deg, #C4453E, #D4605A)" }} className="px-6 py-8 print:py-6">
          <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "rgba(255,255,255,0.8)" }}>
            EMERGENCY INFO
          </p>
          <h1 className="text-3xl font-bold text-white mb-1 print-page">{fullName}</h1>
          <div className="text-white text-sm" style={{ opacity: 0.9 }}>
            {person.date_of_birth && (
              <span>
                Born {formatDateUK(person.date_of_birth)}
                {age !== null && ` (${age} years old)`}
              </span>
            )}
            {person.nhs_number && (
              <span className="ml-4">NHS: {formatNHSNumber(person.nhs_number)}</span>
            )}
          </div>
        </header>

        <main className="px-6 py-6 max-w-2xl mx-auto flex flex-col gap-6 print-page">
          {allergies && allergies.length > 0 && (
            <section className="bg-error-light border border-red-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={20} className="text-error" />
                <h2 className="font-bold text-error text-lg">Allergies</h2>
              </div>
              <ul className="flex flex-col gap-1.5">
                {allergies.map((a) => (
                  <li key={a.name} className="text-warmstone-800">
                    <span className="font-bold">{a.name}</span>
                    {a.severity && <span className="text-error ml-2 text-sm">({a.severity})</span>}
                    {a.reaction && <span className="text-warmstone-600 ml-2 text-sm">{a.reaction}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {allergies?.length === 0 && (
            <section className="bg-sage-50 border border-sage-100 rounded-lg p-4 flex items-center gap-2">
              <span className="text-sage-600 font-semibold text-sm">No known allergies</span>
            </section>
          )}

          {person.dnacpr_status && (
            <section className="bg-error-light border-2 border-error rounded-lg p-5">
              <h2 className="font-bold text-error text-lg uppercase tracking-wide">DNACPR in place</h2>
              <p className="text-warmstone-800 text-sm mt-1">
                This person has a Do Not Attempt Cardiopulmonary Resuscitation order. Please check documentation.
              </p>
            </section>
          )}

          {conditions && conditions.length > 0 && (
            <section className="bg-warmstone-white border border-warmstone-100 rounded-lg p-5">
              <h2 className="font-bold text-warmstone-900 text-lg mb-3">Conditions</h2>
              <ul className="flex flex-col gap-1">
                {conditions.map((c) => (
                  <li key={c.name} className="text-warmstone-800 text-sm">{c.name}</li>
                ))}
              </ul>
            </section>
          )}

          {medications && medications.length > 0 && (
            <section className="bg-warmstone-white border border-warmstone-100 rounded-lg p-5">
              <h2 className="font-bold text-warmstone-900 text-lg mb-3">Current Medications</h2>
              <ul className="flex flex-col gap-2">
                {medications.map((m) => (
                  <li key={m.name} className="text-warmstone-800 text-sm">
                    <span className="font-semibold">{m.name}</span>
                    {(m.dosage || m.frequency) && (
                      <span className="text-warmstone-600 ml-1">
                        {[m.dosage, m.frequency].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(person.next_of_kin_name || person.next_of_kin_phone) && (
            <section className="bg-warmstone-white border border-warmstone-100 rounded-lg p-5">
              <h2 className="font-bold text-warmstone-900 text-lg mb-3">Next of Kin</h2>
              {person.next_of_kin_name && (
                <p className="text-warmstone-800 font-semibold">
                  {person.next_of_kin_name}
                  {person.next_of_kin_relationship && (
                    <span className="text-warmstone-600 font-normal ml-1">({person.next_of_kin_relationship})</span>
                  )}
                </p>
              )}
              {person.next_of_kin_phone && (
                <p className="text-warmstone-800 text-lg font-bold mt-1">{person.next_of_kin_phone}</p>
              )}
            </section>
          )}

          {(person.gp_surgery || person.gp_name) && (
            <section className="bg-warmstone-white border border-warmstone-100 rounded-lg p-5">
              <h2 className="font-bold text-warmstone-900 text-lg mb-2">GP</h2>
              {person.gp_surgery && <p className="text-warmstone-800">{person.gp_surgery}</p>}
              {person.gp_name && <p className="text-warmstone-600 text-sm">{person.gp_name}</p>}
            </section>
          )}
        </main>

        <footer className="px-6 py-6 border-t border-warmstone-100 text-center text-xs text-warmstone-400 print-page">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Bug size={12} className="text-honey-400" />
            <span>CareBee</span>
          </div>
          <p>This summary was generated by CareBee. Last updated: {formatDateUK(person.updated_at)}.</p>
        </footer>
      </div>
    </>
  );
}
