"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

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
            <span className={`text-sm font-semibold w-16 text-right transition-colors ${!annual ? "text-warmstone-900" : "text-warmstone-400"}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setAnnual(!annual)}
              aria-pressed={annual}
              aria-label="Toggle annual billing"
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-honey-400 ${annual ? "bg-honey-400" : "bg-warmstone-200"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${annual ? "translate-x-[22px]" : "translate-x-0.5"}`}
              />
            </button>
            <span className={`text-sm font-semibold w-16 text-left transition-colors ${annual ? "text-warmstone-900" : "text-warmstone-400"}`}>
              Annual
            </span>
          </div>
          <span className={`text-xs font-bold text-honey-600 transition-opacity duration-200 ${annual ? "opacity-100" : "opacity-0"}`}>
            Save 25% with annual billing
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {/* Free card */}
          <div className="bg-warmstone-white border border-warmstone-200 rounded-xl p-7 flex flex-col">
            <div className="font-bold text-warmstone-900 text-xl mb-1">Free</div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-display text-4xl text-warmstone-900">£0</span>
              <span className="text-warmstone-400">forever</span>
            </div>
            <ul className="flex flex-col gap-3 flex-1 mb-8">
              {[
                "Record for one person",
                "Conditions, medications, allergies, appointments",
                "Document storage",
                "Up to 2 family members",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-sage-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-warmstone-800">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="border-2 border-warmstone-300 text-warmstone-800 font-bold rounded-md px-4 py-3 block text-center hover:bg-warmstone-50 transition-colors"
            >
              Get started
            </Link>
          </div>

          {/* Plus card */}
          <div className="bg-honey-50 border-2 border-honey-400 rounded-xl p-7 flex flex-col relative">
            <span className="absolute -top-3 left-6 bg-honey-400 text-white text-xs font-bold px-3 py-1 rounded-full">
              Included free for 30 days
            </span>
            <div className="font-bold text-warmstone-900 text-xl mb-1">CareBee Plus</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-display text-4xl text-warmstone-900">
                {annual ? "£44.99" : "£4.99"}
              </span>
              <span className="text-warmstone-400">{annual ? "/year" : "/month"}</span>
            </div>
            {annual && (
              <div className="text-sage-600 text-sm font-semibold mb-5">
                Saving £14.89 vs monthly
              </div>
            )}
            <ul className="flex flex-col gap-3 flex-1 mb-8 mt-5">
              <li className="text-warmstone-500 font-semibold text-sm">
                Everything in Free, plus:
              </li>
              {[
                "AI document scanning",
                "Benefits and entitlements engine",
                "Drug interaction checker",
                "Appointment preparation briefs",
                "Waiting list estimates and chase letters",
                "Unlimited people and family members",
                "Emergency QR codes",
                "Weekly family digest",
                "Communications log",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="text-sage-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-warmstone-800">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="bg-honey-400 text-white font-bold rounded-md px-4 py-3 block text-center hover:bg-honey-600 transition-colors shadow-[0_2px_8px_rgba(232,168,23,0.25)]"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
