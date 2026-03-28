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
  Sparkles,
  Calendar,
  FileText,
  Mail,
  MessageSquare,
  NotebookPen,
  Lock,
  Server,
  CheckCircle,
  Brain,
  Heart,
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

      {/* What is CareBee? */}
      <section id="what-is-carebee" className="bg-warmstone-white px-4 md:px-8 py-20 border-t border-warmstone-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-6">
            What is CareBee?
          </h2>
          <p className="text-warmstone-600 text-lg leading-relaxed text-center max-w-3xl mx-auto mb-10">
            CareBee is an AI-powered health and care record app for anyone who manages health, whether that is their
            own or someone else's. One place to keep every condition, medication, appointment, document, and letter.
            The AI reads your paperwork, checks for medication risks, finds benefits you may be missing, and flags
            gaps in care before they become problems.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-honey-50 border border-honey-200 rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileStack size={24} className="text-honey-600" />
              </div>
              <h3 className="font-bold text-warmstone-900 mb-2">Everything in one place</h3>
              <p className="text-sm text-warmstone-600 leading-relaxed">
                Conditions, medications, allergies, appointments, test results, documents, daily care logs and care
                notes. No more searching through folders and emails.
              </p>
            </div>
            <div className="bg-honey-50 border border-honey-200 rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain size={24} className="text-honey-600" />
              </div>
              <h3 className="font-bold text-warmstone-900 mb-2">AI that does the heavy lifting</h3>
              <p className="text-sm text-warmstone-600 leading-relaxed">
                Photograph a hospital letter and the AI extracts the information automatically. It checks for drug
                interactions, flags care gaps, and finds support you may be entitled to.
              </p>
            </div>
            <div className="bg-honey-50 border border-honey-200 rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users size={24} className="text-honey-600" />
              </div>
              <h3 className="font-bold text-warmstone-900 mb-2">Built for carers and families</h3>
              <p className="text-sm text-warmstone-600 leading-relaxed">
                Use it just for yourself, or look after multiple people and share access with siblings, partners, and
                other carers. Everyone sees the same record, in real time.
              </p>
            </div>
          </div>
          <p className="text-center">
            <a href="#features" className="text-honey-600 font-semibold text-sm hover:text-honey-800 transition-colors">
              See everything CareBee does below
            </a>
          </p>
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
            For you, and everyone involved in your care or the care of someone you look after. CareBee brings together
            what you actually need, built around how the NHS really works and the
            paperwork it produces.
          </p>

          {/* Feature category: Health record */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-warmstone-400 mb-5">The record</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-14">
            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <ClipboardList size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Complete health records</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Conditions, medications, allergies, appointments, test results, and documents in one place.
                Share with anyone who needs it and revoke access any time.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <NotebookPen size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Care notes</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                A freeform notepad for anything that does not fit elsewhere. Pin important notes so they are
                always visible. Categorise by topic. Share with everyone on the care team.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <FileText size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Daily care records</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Log each shift: mood, meals, mobility, medications given, any concerns. Flag something for
                follow-up and it appears at the top of the next carer's screen. Essential when multiple people
                are involved in someone's care.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <MessageSquare size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Communications log</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                A record of every call, email, and letter with the NHS, social services, care agencies, and
                the benefits office. Know exactly who said what and when.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <Clock size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Waiting list tracking</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Uses NHS referral-to-treatment data to show whether a wait is normal for the area and
                specialty. Generates chase letters if it is not.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <QrCode size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Emergency QR codes</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Generate a QR code with critical health information. If something happens and the person cannot
                speak, a paramedic scans it and sees conditions, medications, allergies, and next of kin.
                Works without signal.
              </p>
            </div>
          </div>

          {/* Feature category: AI */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-warmstone-400 mb-5">AI features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-14">
            <div>
              <div className="bg-honey-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <ScanLine size={28} className="text-honey-500" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">AI document scanning</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Photograph a hospital letter, discharge summary, prescription, or medication label. CareBee
                extracts the key information, updates the record automatically, and tells you what to do next.
              </p>
            </div>

            <div>
              <div className="bg-honey-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <ShieldAlert size={28} className="text-honey-500" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Medication safety checks</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                CareBee checks for known drug interactions across every medication in the record. When
                different specialists are prescribing without talking to each other, things get missed. CareBee
                flags anything worth raising with a pharmacist or GP.
              </p>
            </div>

            <div>
              <div className="bg-honey-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <Sparkles size={28} className="text-honey-500" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Health insights and alerts</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                CareBee looks at the full record and flags care gaps: an HbA1c that may be overdue, a
                screening the person is eligible for, a medication that has not had a review in over a year.
                Based on NICE guidelines, in plain English.
              </p>
            </div>

            <div>
              <div className="bg-honey-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <PoundSterling size={28} className="text-honey-500" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Benefits and entitlements</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Answer a few questions and CareBee checks what the person may be entitled to: Attendance
                Allowance, Carer's Allowance, blue badges, PIP, and more. It explains the criteria, shows
                which ones are met, and walks through how to apply.
              </p>
            </div>

            <div>
              <div className="bg-honey-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <Calendar size={28} className="text-honey-500" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Appointment preparation</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Before every GP or consultant visit, CareBee generates a brief: what has changed since the
                last appointment, what questions to raise, and what the clinician will likely want to know.
              </p>
            </div>

            <div>
              <div className="bg-honey-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <FileStack size={28} className="text-honey-500" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Letter templates</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Generate letters using the information already in the record. Employer letters explaining
                caring responsibilities, Attendance Allowance supporting statements, blue badge applications,
                PALS complaint letters, waiting list chase letters, and GP referral requests.
              </p>
            </div>
          </div>

          {/* Feature category: Sharing */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-warmstone-400 mb-5">Sharing and care teams</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <Users size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Shared care circles</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Invite siblings, partners, and other carers to the record. Assign roles: owner, editor, or
                viewer. Everyone sees the same information in real time. Revoke access whenever you need to.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <Mail size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Weekly care digest</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                Every member of the care team gets a weekly email summary of what has changed in the record:
                new medications, upcoming appointments, open follow-up flags, and new documents. Sent on the
                day you choose.
              </p>
            </div>

            <div>
              <div className="bg-sage-50 w-14 h-14 rounded-xl flex items-center justify-center">
                <Heart size={28} className="text-sage-400" />
              </div>
              <h3 className="font-bold text-warmstone-900 text-lg mt-4 mb-2">Use it just for yourself</h3>
              <p className="text-warmstone-600 text-sm leading-relaxed">
                You do not have to be a carer to use CareBee. Many people use it to manage their own complex
                health conditions, track test results over time, and make sure nothing falls through the
                cracks with their own GP.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How the AI works */}
      <section className="bg-warmstone-50 px-4 md:px-8 py-20 border-t border-warmstone-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-4">
            How the AI works
          </h2>
          <p className="text-warmstone-600 text-center max-w-2xl mx-auto mb-12">
            CareBee uses Claude, an AI made by Anthropic. Every AI feature is designed to support
            informed conversations with healthcare professionals, not replace them.
          </p>
          <div className="flex flex-col gap-6">
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex gap-5 items-start">
              <div className="w-10 h-10 bg-honey-100 rounded-lg flex items-center justify-center shrink-0">
                <ScanLine size={20} className="text-honey-600" />
              </div>
              <div>
                <h3 className="font-bold text-warmstone-900 mb-1">Document scanning</h3>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  You photograph a letter or document. The AI reads it, identifies conditions, medications,
                  appointments, and test results, and asks you to confirm before saving anything to the record.
                  You are always in control of what gets added.
                </p>
              </div>
            </div>
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex gap-5 items-start">
              <div className="w-10 h-10 bg-honey-100 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-honey-600" />
              </div>
              <div>
                <h3 className="font-bold text-warmstone-900 mb-1">Health insights</h3>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  The AI reviews the full health record against NICE clinical guidelines and flags things that
                  may have been missed: a blood test that may be overdue, a screening programme the person is
                  eligible for, a medication that has not had a review. It never diagnoses. Every insight is
                  framed as something to raise with a GP or specialist.
                </p>
              </div>
            </div>
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex gap-5 items-start">
              <div className="w-10 h-10 bg-honey-100 rounded-lg flex items-center justify-center shrink-0">
                <PoundSterling size={20} className="text-honey-600" />
              </div>
              <div>
                <h3 className="font-bold text-warmstone-900 mb-1">Benefits checking</h3>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  You answer questions about the person's situation. The AI checks eligibility against the
                  criteria for each benefit, explains which criteria are met and which are not, and shows exactly
                  how to apply. Attendance Allowance higher rate alone is worth over £5,700 per year. Most
                  applications are rejected because the language is wrong, not because the person does not
                  qualify. CareBee helps you get it right.
                </p>
              </div>
            </div>
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex gap-5 items-start">
              <div className="w-10 h-10 bg-honey-100 rounded-lg flex items-center justify-center shrink-0">
                <Lock size={20} className="text-honey-600" />
              </div>
              <div>
                <h3 className="font-bold text-warmstone-900 mb-1">Your data is never used to train AI models</h3>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  When the AI analyses your record, it sends only the minimum information needed to generate the
                  response. Anthropic does not use CareBee data to train its models. Your health information
                  belongs to you.
                </p>
              </div>
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
                Sign up free. No credit card. You get instant access to all CareBee Plus or
                Self-Care Plus features for 30 days.
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
        </div>
      </section>

      {/* Data and security */}
      <section className="px-4 md:px-8 py-20 bg-warmstone-50 border-t border-warmstone-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-4">
            Where is your data stored and who can see it?
          </h2>
          <p className="text-warmstone-600 text-center max-w-2xl mx-auto mb-12">
            Health information is some of the most sensitive data there is. Here is exactly how CareBee handles it.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex gap-4 items-start">
              <Server size={20} className="text-sage-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-warmstone-900 mb-1">Stored in Europe</h3>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  All CareBee data is stored on Supabase infrastructure hosted in the European Union, within
                  UK GDPR requirements. It never leaves EU-based servers.
                </p>
              </div>
            </div>
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex gap-4 items-start">
              <Lock size={20} className="text-sage-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-warmstone-900 mb-1">Encrypted at rest and in transit</h3>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  All data is encrypted at rest and all connections use TLS. No one at CareBee reads your
                  health records.
                </p>
              </div>
            </div>
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex gap-4 items-start">
              <Users size={20} className="text-sage-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-warmstone-900 mb-1">You control who sees it</h3>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  Only you and the people you explicitly invite can access a care record. You can revoke access
                  for any member of the care circle at any time.
                </p>
              </div>
            </div>
            <div className="bg-warmstone-white border border-warmstone-100 rounded-xl p-6 flex gap-4 items-start">
              <CheckCircle size={20} className="text-sage-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-warmstone-900 mb-1">Delete everything, any time</h3>
                <p className="text-sm text-warmstone-600 leading-relaxed">
                  You can delete your account and all associated data at any time from settings. We do not
                  retain data after deletion.
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-warmstone-500">
            Read our full{" "}
            <Link href="/privacy" className="text-honey-600 font-semibold hover:text-honey-800 transition-colors">
              Privacy Policy
            </Link>
            {" "}and{" "}
            <Link href="/terms" className="text-honey-600 font-semibold hover:text-honey-800 transition-colors">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-4 md:px-8 py-20 bg-warmstone-white border-t border-warmstone-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 mb-8">
            About CareBee
          </h2>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <p className="text-warmstone-600 leading-relaxed mb-4">
                CareBee is built by a small UK team with backgrounds in healthcare, decades of experience
                building software and complex systems, and first-hand experience of what it actually means
                to care for someone. We have been in the appointments, dealt with the paperwork, navigated
                the benefits system, and watched things fall through the cracks that should not have.
              </p>
              <p className="text-warmstone-600 leading-relaxed mb-4">
                We built CareBee because the tools that existed were not good enough. Information was
                scattered across folders, emails, and memory. Nobody in the care team had the full picture.
                The admin was relentless. And the people bearing the brunt of it were already stretched.
              </p>
              <p className="text-warmstone-600 leading-relaxed mb-4">
                CareBee is built specifically for the UK: NHS letters, NICE guidelines, UK benefits, and UK
                healthcare pathways. It is designed to be used by anyone, not just people who are comfortable
                with technology, and it is priced as low as we can manage because the people who need it
                most are often the ones with the least to spare.
              </p>
              <p className="text-warmstone-600 leading-relaxed">
                We are independent. We are not backed by health insurers or pharmaceutical companies.
                We make money from subscriptions, full stop.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-warmstone-100">
            <p className="text-sm text-warmstone-500 mb-1 font-semibold">Get in touch</p>
            <p className="text-sm text-warmstone-600">
              Questions, feedback, or want to tell us what we are missing?{" "}
              <Link href="/contact" className="text-honey-600 font-semibold hover:text-honey-800 transition-colors">
                Contact us
              </Link>
              {" "}or email{" "}
              <a href="mailto:support@carebee.co.uk" className="text-honey-600 font-semibold hover:text-honey-800 transition-colors">
                support@carebee.co.uk
              </a>
              . We read everything.
            </p>
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
