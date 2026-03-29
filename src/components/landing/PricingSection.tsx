"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface Plan {
  name: string;
  label: string;
  monthly: string;
  annual: string;
  annualNote: string;
  monthlyNote: string;
  features: string[];
  newFrom?: string; // subheading after which features are "new" (rendered prominently)
  cta: string;
  ctaHref: string;
  highlight: boolean;
  badge: string | null;
}

const plans: Plan[] = [
  {
    name: "Free",
    label: "Getting started",
    monthly: "£0",
    annual: "£0",
    annualNote: "forever",
    monthlyNote: "forever",
    features: [
      "Record for one person",
      "Conditions, medications, allergies, appointments",
      "Document storage",
      "Manual entry",
    ],
    cta: "Get started",
    ctaHref: "/signup",
    highlight: false,
    badge: null,
  },
  {
    name: "Self-Care Standard",
    label: "For managing your own health",
    monthly: "£2.99",
    annual: "£29.99",
    annualNote: "/year",
    monthlyNote: "/month",
    features: [
      "Everything in Free, plus:",
      "20 AI uses per month",
      "AI document scanning",
      "Medication interaction checker",
      "Health insights",
      "Benefits and entitlements engine",
      "Letter generation",
      "Appointment preparation",
    ],
    cta: "Start free trial",
    ctaHref: "/signup?type=self_care",
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Self-Care Plus",
    label: "For power users",
    monthly: "£4.99",
    annual: "£49.99",
    annualNote: "/year",
    monthlyNote: "/month",
    features: [
      "Everything in Standard:",
      "AI document scanning",
      "Medication interaction checker",
      "Health insights",
      "Benefits and entitlements engine",
      "Letter generation",
      "Appointment preparation",
      "Plus adds:",
      "Unlimited AI uses",
    ],
    newFrom: "Plus adds:",
    cta: "Start free trial",
    ctaHref: "/signup?type=self_care",
    highlight: false,
    badge: null,
  },
  {
    name: "CareBee Plus",
    label: "For carers and care teams",
    monthly: "£7.99",
    annual: "£79.99",
    annualNote: "/year",
    monthlyNote: "/month",
    features: [
      "Everything in Self-Care Plus, plus:",
      "Multiple people",
      "Care circles and shared access",
      "Invite others with role permissions",
      "Weekly care digest email",
      "Emergency QR codes",
      "Communications log",
    ],
    cta: "Start free trial",
    ctaHref: "/signup?type=carer",
    highlight: false,
    badge: null,
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="px-4 md:px-8 py-20 bg-warmstone-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-4">
          Start free. Upgrade when you are ready.
        </h2>
        <p className="text-warmstone-600 max-w-2xl mx-auto text-center">
          Every new account gets full access to CareBee Plus for 30 days. No credit card required.
          After your trial, keep using the free tier forever or upgrade to keep the AI features.
        </p>

        {/* Toggle */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold transition-colors ${!annual ? "text-honey-600" : "text-warmstone-400"}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setAnnual((v) => !v)}
              aria-pressed={annual}
              aria-label="Toggle annual billing"
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-honey-400 ${annual ? "bg-honey-400" : "bg-warmstone-300"}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 mt-0.5 ${annual ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
            <span className={`text-sm font-semibold transition-colors ${annual ? "text-honey-600" : "text-warmstone-400"}`}>
              Annual
            </span>
          </div>
          <span className={`text-xs font-bold text-honey-600 transition-opacity duration-200 ${annual ? "opacity-100" : "opacity-0"}`}>
            Save with annual billing
          </span>
        </div>

        {/* Early adopter banner */}
        <div className="mt-8 bg-honey-50 border border-honey-300 rounded-xl px-5 py-4 flex items-start gap-3 max-w-3xl mx-auto">
          <span className="text-2xl shrink-0" aria-hidden="true">🐝</span>
          <p className="text-warmstone-800 text-sm leading-relaxed">
            <span className="font-bold">Early adopter offer:</span> Sign up before 1 July 2026 and
            lock in CareBee Plus at £4.99/mo forever.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-6 flex flex-col relative ${
                plan.highlight
                  ? "bg-honey-50 border-2 border-honey-400"
                  : "bg-warmstone-white border border-warmstone-200"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-5 bg-honey-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="font-bold text-warmstone-900 text-lg mb-0.5">{plan.name}</div>
              <div className="text-warmstone-500 text-xs mb-4">{plan.label}</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-3xl text-warmstone-900">
                  {annual ? plan.annual : plan.monthly}
                </span>
                <span className="text-warmstone-400 text-sm">
                  {annual ? plan.annualNote : plan.monthlyNote}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5 flex-1 mb-6">
                {(() => {
                  let isNew = false;
                  return plan.features.map((feature) => {
                    if (feature.endsWith(":")) {
                      if (plan.newFrom && feature === plan.newFrom) isNew = true;
                      return (
                        <li key={feature} className={`font-semibold text-xs mt-1 ${isNew ? "text-honey-700" : "text-warmstone-500"}`}>
                          {feature}
                        </li>
                      );
                    }
                    return (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle size={15} className={`shrink-0 mt-0.5 ${isNew ? "text-sage-400" : "text-warmstone-300"}`} />
                        <span className={`text-sm ${isNew ? "text-warmstone-800 font-semibold" : "text-warmstone-500"}`}>{feature}</span>
                      </li>
                    );
                  });
                })()}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`rounded-md px-4 py-2.5 block text-center font-bold text-sm transition-colors ${
                  plan.highlight
                    ? "bg-honey-400 text-white hover:bg-honey-600 shadow-[0_2px_8px_rgba(232,168,23,0.25)]"
                    : "border-2 border-warmstone-300 text-warmstone-800 hover:bg-warmstone-50"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-warmstone-400 mt-6">
          All paid plans include a 30-day free trial. No card required to start.
        </p>
      </div>
    </section>
  );
}
