"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Is my data safe?",
    a: "Yes. CareBee uses Supabase with SOC 2 compliance and EU hosting. Your health data is special category data under UK GDPR and we treat it that way. Your data is yours, you can export or delete it at any time.",
  },
  {
    q: "Is CareBee giving me medical advice?",
    a: "No. CareBee surfaces information and flags things for you to raise with your GP or consultant. It does not diagnose, prescribe, or replace professional medical advice.",
  },
  {
    q: "What happens after my 30 day trial?",
    a: "You keep your account and all your data. You are automatically moved to the free tier, which includes a basic record for one person with up to 2 family members. You can upgrade to CareBee Plus at any time to get the AI features back.",
  },
  {
    q: "Can I use it for more than one person?",
    a: "On CareBee Plus, yes. You can create records for as many people as you need within a household, and you can be part of multiple households. For example, your mum's care and your father-in-law's care can each have their own household.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. CareBee works in your phone's browser and can be added to your home screen like an app. No app store download needed.",
  },
  {
    q: "Who built this?",
    a: "CareBee is built by a small team in the UK who understand the caring system firsthand. We are building in the open with feedback from real carers.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="px-4 md:px-8 py-20 bg-warmstone-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl text-warmstone-900 text-center mb-12">
          Questions you might have
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-warmstone-200 rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(open === index ? null : index)}
                className="w-full flex items-center justify-between px-5 py-4 text-left bg-warmstone-white hover:bg-warmstone-50 transition-colors min-h-[56px]"
                aria-expanded={open === index}
              >
                <span className="font-semibold text-warmstone-900 pr-4">{faq.q}</span>
                <ChevronDown
                  size={20}
                  className={`text-warmstone-400 shrink-0 transition-transform duration-200 ${
                    open === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === index && (
                <div className="px-5 pb-4 pt-3 text-warmstone-600 text-sm leading-relaxed border-t border-warmstone-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
