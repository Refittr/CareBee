import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileStack,
  Users,
  Clock,
  PoundSterling,
  ClipboardList,
  ScanLine,
  ShieldAlert,
  QrCode,
  User,
  HeartHandshake,
} from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroMockup } from "@/components/landing/HeroMockup";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";

export const metadata: Metadata = {
  title: "CareBee | AI-powered health management for you and the people you care for",
  description:
    "CareBee keeps your health records, medications, appointments and documents in one place. Whether you are managing your own health or looking after someone else, our AI reads your paperwork, finds missing benefits, and flags medication risks. Free for 30 days.",
  openGraph: {
    title: "CareBee | AI-powered health management for you and the people you care for",
    description:
      "CareBee keeps your health records, medications, appointments and documents in one place. Whether you are managing your own health or looking after someone else, our AI reads your paperwork, finds missing benefits, and flags medication risks. Free for 30 days.",
    type: "website",
  },
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="overflow-x-hidden">
      <style>{`html { scroll-behavior: smooth; }`}</style>

      <LandingHeader />

      {/* Hero */}
      <section>
        <div
          className="px-4 md:px-8 pt-20 md:pt-24 pb-20 md:pb-28 max-w-6xl mx-auto"
          style={{ background: "radial-gradient(ellipse at top right, #FFF8E6 0%, #FEFCFA 60%)" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left column */}
            <div>
              <span className="text-honey-600 text-sm font-bold bg-honey-50 px-3 py-1 rounded-full inline-block mb-6">
                Free for 30 days. No card required.
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-warmstone-900 leading-tight mb-6">
                One record for everyone who cares
              </h1>
              <p className="text-warmstone-600 text-lg leading-relaxed mb-8 max-w-lg">
                Whether you are managing your own health or looking after someone else, CareBee
                keeps everything in one place. Conditions, medications, appointments and documents,
                with AI that reads your paperwork, spots risks and finds the support you are
                entitled to.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Link
                  href="/signup?type=self_care"
                  className="inline-flex items-center justify-center gap-2 bg-honey-400 text-white font-bold rounded-md px-6 py-4 text-base hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] min-h-[56px]"
                >
                  <User size={18} />
                  I am managing my own health
                </Link>
                <Link
                  href="/signup?type=carer"
                  className="inline-flex items-center justify-center gap-2 bg-warmstone-900 text-white font-bold rounded-md px-6 py-4 text-base hover:bg-warmstone-700 transition-colors min-h-[56px]"
                >
                  <HeartHandshake size={18} />
                  I am caring for someone else
                </Link>
              </div>
              <p className="text-sm text-warmstone-400">
                Free for 30 days. No card needed.
              </p>
            </div>

            {/* Right column */}
            <div>
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section id="pain-points" className="bg-warmstone-50 px-4 md:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-12">
            Sound familiar?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-warmstone-white border border-warmstone-100 rounded-lg p-6 shadow-sm">
              <FileStack size={32} className="text-honey-400" />
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Paperwork everywhere
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Letters from three different hospitals, a stack of discharge summaries, a bag full
                of prescription slips. Whether they are your own or someone else's, finding
                anything takes half an hour and a lot of stress.
              </p>
            </div>

            <div className="bg-warmstone-white border border-warmstone-100 rounded-lg p-6 shadow-sm">
              <ShieldAlert size={32} className="text-honey-400" />
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Keeping track of it all yourself
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Multiple conditions, a list of medications that keeps growing, appointments across
                different departments. It all lives in your head, and one missed interaction or
                forgotten appointment can have real consequences.
              </p>
            </div>

            <div className="bg-warmstone-white border border-warmstone-100 rounded-lg p-6 shadow-sm">
              <Clock size={32} className="text-honey-400" />
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Hours lost to admin
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Chasing your own referrals, writing letters to GP practices, re-explaining the same
                history to every new clinician, preparing for appointments. It is a part-time job
                on top of everything else.
              </p>
            </div>

            <div className="bg-warmstone-white border border-warmstone-100 rounded-lg p-6 shadow-sm">
              <PoundSterling size={32} className="text-honey-400" />
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Missing out on support
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Billions in benefits go unclaimed every year because the system is too complicated
                to navigate. You are probably entitled to more than you are getting right now.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 md:px-8 py-20 bg-warmstone-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-4">
            Everything in one place
          </h2>
          <p className="text-warmstone-600 text-center max-w-2xl mx-auto mb-12">
            For you, your family, and everyone in your care team. CareBee brings together
            what you actually need, built around how the NHS really works and the
            paperwork it produces.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <ClipboardList size={32} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Complete health records
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Conditions, medications, allergies, appointments, and documents in one place.
                Share with anyone who needs it, revoke access any time.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <Users size={32} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Works for you or your whole care team
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Use CareBee solo for your own health, or create records for everyone you look
                after and invite family to help. Each person has their own record, shared with
                exactly the right people.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <ScanLine size={32} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                AI document scanning
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Photograph a hospital letter and CareBee extracts the key information, updates
                the record, and tells you what to do next.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <PoundSterling size={32} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Benefits and entitlements
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Answer a few questions and CareBee tells you what benefits, grants, and support
                schemes you are likely eligible for. Stop leaving money on the table.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <ShieldAlert size={32} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Medication safety checks
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                CareBee checks for known drug interactions across every medication in the record
                and flags anything worth raising with a pharmacist or GP.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <QrCode size={32} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">
                Emergency QR codes
              </h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Generate a QR code with critical health information. If something happens and
                you or the person you look after cannot speak, a paramedic scans it and sees
                everything they need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-warmstone-50 px-4 md:px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-4">
            Up and running in 5 minutes
          </h2>
          <p className="text-warmstone-600 text-center max-w-xl mx-auto">
            No lengthy setup. No training needed. You can have a complete record ready before
            your next appointment.
          </p>
          <div className="relative flex flex-col md:flex-row gap-8 md:gap-4 items-start mt-12">
            {/* Connector line on desktop */}
            <div className="hidden md:block absolute top-6 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-px border-t-2 border-dashed border-warmstone-200" />

            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-12 h-12 rounded-full bg-honey-400 text-white font-display text-xl flex items-center justify-center mb-4 relative z-10">
                1
              </div>
              <h3 className="font-bold text-warmstone-900 mb-2">Create an account</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed max-w-xs">
                Sign up free. No credit card. You get instant access to all CareBee Plus features
                for 30 days.
              </p>
            </div>

            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-12 h-12 rounded-full bg-honey-400 text-white font-display text-xl flex items-center justify-center mb-4 relative z-10">
                2
              </div>
              <h3 className="font-bold text-warmstone-900 mb-2">Set up your health profile</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed max-w-xs">
                Tell us who you are tracking health for. Just yourself, someone you care for,
                or both. Enter what you know today and add more as you go.
              </p>
            </div>

            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-12 h-12 rounded-full bg-honey-400 text-white font-display text-xl flex items-center justify-center mb-4 relative z-10">
                3
              </div>
              <h3 className="font-bold text-warmstone-900 mb-2">Let CareBee do the heavy lifting</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed max-w-xs">
                Scan a letter, check for benefits, invite a sibling to help. The record grows
                with you and stays up to date automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      {/* Trust and Stats */}
      <section className="px-4 md:px-8 py-20 bg-warmstone-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-12">
            Built for real people
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="font-display text-5xl text-honey-400 mb-2">5.7M</div>
              <p className="text-warmstone-600 text-sm leading-relaxed max-w-xs mx-auto">
                unpaid carers in the UK, managing medications, appointments, and paperwork for
                someone they love
              </p>
            </div>
            <div className="text-center">
              <div className="font-display text-5xl text-honey-400 mb-2">600</div>
              <p className="text-warmstone-600 text-sm leading-relaxed max-w-xs mx-auto">
                people leave work every day to care for someone, often without the tools or
                information they need
              </p>
            </div>
            <div className="text-center">
              <div className="font-display text-5xl text-honey-400 mb-2">64%</div>
              <p className="text-warmstone-600 text-sm leading-relaxed max-w-xs mx-auto">
                of patients experienced an NHS admin problem last year, from lost referrals to
                incorrect medication lists. This affects everyone, not just carers.
              </p>
            </div>
          </div>
          <div className="mt-16 text-center">
            <p className="text-warmstone-600 max-w-xl mx-auto mb-6">
              CareBee is in early testing. We are working with real people to build something
              that actually helps. Want to help shape it?
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center bg-sage-400 text-white font-bold rounded-md px-6 py-3 hover:bg-sage-600 transition-colors min-h-[44px]"
            >
              Join the testing group
            </Link>
          </div>
        </div>
      </section>

      <FaqSection />

      {/* Pricing philosophy */}
      <section className="px-4 md:px-8 py-16 bg-warmstone-white border-t border-warmstone-100">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start gap-4">
            <span className="text-3xl leading-none mt-1" aria-hidden="true">🐝</span>
            <div>
              <h2 className="font-display text-xl md:text-2xl text-warmstone-900 mb-4 leading-snug">
                A note on pricing
              </h2>
              <p className="text-warmstone-600 leading-relaxed">
                CareBee starts at <span className="font-semibold text-warmstone-800">£2.99 a month</span> for
                individuals managing their own health. If you are looking after someone else,
                CareBee Plus is <span className="font-semibold text-warmstone-800">£7.99 a month</span>.
                The AI features cost us money every time they run, but we have priced it as low
                as we can. We know the people who need CareBee most are often the ones with the
                least to spare, and we never want cost to be a barrier. We have a number of free
                Plus licences to give away each month. Please get in touch using the contact at
                the bottom of this page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 md:px-8 py-24 bg-sage-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl text-warmstone-900 mb-6 leading-tight">
            You have enough to worry about. Let CareBee handle the admin.
          </h2>
          <p className="text-warmstone-600 mb-10 text-lg max-w-lg mx-auto">
            Start your free 30 day trial. No credit card. No commitment. Just one less thing to
            carry in your head.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Link
              href="/signup?type=self_care"
              className="inline-flex items-center justify-center gap-2 bg-honey-400 text-white font-bold rounded-md px-8 py-4 text-lg hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)] min-h-[56px]"
            >
              <User size={20} />
              Managing my own health
            </Link>
            <Link
              href="/signup?type=carer"
              className="inline-flex items-center justify-center gap-2 bg-warmstone-900 text-white font-bold rounded-md px-8 py-4 text-lg hover:bg-warmstone-700 transition-colors min-h-[56px]"
            >
              <HeartHandshake size={20} />
              Caring for someone else
            </Link>
          </div>
          <p className="text-sm text-warmstone-400 mt-4">
            Free for 30 days. Then from £2.99/month.
            Contact us for enterprise and whitelabel options.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-warmstone-50 border-t border-warmstone-100 px-4 md:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-sm text-warmstone-400">
            <Link href="/privacy" className="hover:text-warmstone-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-warmstone-600 transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-warmstone-600 transition-colors">
              Contact
            </Link>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <span className="text-sm text-warmstone-400">Made in the UK</span>
            <span className="text-xs text-warmstone-300">Copyright 2026 CareBee</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
