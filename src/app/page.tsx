import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, CalendarCheck, QrCode } from "lucide-react";
import { BeeIcon } from "@/components/ui/BeeIcon";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareBee: Your health and care record",
  description:
    "Keep conditions, medications, appointments, and documents for yourself and everyone you care for, in one secure place.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-warmstone-white flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-warmstone-100">
        <div className="flex items-center gap-2">
          <BeeIcon size={24} className="text-honey-400" />
          <span className="font-display text-xl text-warmstone-900">CareBee</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-warmstone-600 hover:text-warmstone-900 transition-colors min-h-[44px] flex items-center"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-honey-400 text-warmstone-white font-bold text-sm rounded-md px-4 py-2 hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] min-h-[44px] flex items-center"
          >
            Get started free
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 py-20 md:py-32 text-center max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl text-warmstone-900 leading-tight mb-6">
            Your care records, all in one place
          </h1>
          <p className="text-lg md:text-xl text-warmstone-600 mb-10 max-w-xl mx-auto leading-relaxed">
            The NHS has a record for clinicians. CareBee is the record for families.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-honey-400 text-warmstone-white font-bold rounded-md px-8 py-4 text-lg hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] min-h-[52px] flex items-center justify-center"
            >
              Get started free
            </Link>
            <a
              href="#features"
              className="bg-transparent text-warmstone-800 border border-warmstone-200 font-bold rounded-md px-8 py-4 text-lg hover:bg-warmstone-100 transition-colors min-h-[52px] flex items-center justify-center"
            >
              Learn more
            </a>
          </div>
        </section>

        <section id="features" className="px-6 py-16 bg-warmstone-50">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-lg bg-honey-50 flex items-center justify-center">
                <Users size={24} className="text-honey-600" />
              </div>
              <div>
                <h3 className="font-bold text-warmstone-900 text-lg mb-2">
                  One record for everyone
                </h3>
                <p className="text-warmstone-600 text-sm leading-relaxed">
                  Keep conditions, medications, appointments, and documents for yourself and everyone you care for, in one secure place.
                </p>
              </div>
            </div>

            <div className="bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-lg bg-sage-50 flex items-center justify-center">
                <CalendarCheck size={24} className="text-sage-600" />
              </div>
              <div>
                <h3 className="font-bold text-warmstone-900 text-lg mb-2">
                  Never miss a thing
                </h3>
                <p className="text-warmstone-600 text-sm leading-relaxed">
                  Track appointments across every hospital and GP surgery. Know what was said,
                  what was agreed, and what comes next.
                </p>
              </div>
            </div>

            <div className="bg-warmstone-white border border-warmstone-100 rounded-lg shadow-sm p-6 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-lg bg-info-light flex items-center justify-center">
                <QrCode size={24} className="text-info" />
              </div>
              <div>
                <h3 className="font-bold text-warmstone-900 text-lg mb-2">
                  Emergency info, always ready
                </h3>
                <p className="text-warmstone-600 text-sm leading-relaxed">
                  Generate a QR code with critical health details. A paramedic scans it and sees
                  everything they need.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 border-t border-warmstone-100 text-center text-sm text-warmstone-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BeeIcon size={16} className="text-honey-400" />
          <span className="font-display text-warmstone-600">CareBee</span>
        </div>
        <p>Your health and care record. Built for UK families and carers.</p>
      </footer>
    </div>
  );
}
