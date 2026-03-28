"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

export function HelpPopout() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1 text-warmstone-400 hover:text-warmstone-700 transition-colors rounded-full"
        aria-label="How to write a good daily care record"
      >
        <HelpCircle size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative ml-auto w-full max-w-md h-full bg-warmstone-white shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-warmstone-200">
              <h2 className="text-base font-bold text-warmstone-900">
                How to write a good daily care record
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-warmstone-400 hover:text-warmstone-800 hover:bg-warmstone-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 text-sm text-warmstone-700">
              <p className="leading-relaxed">
                A daily care record is a snapshot of someone&apos;s day. Done well, it helps everyone involved stay on the same page and builds a clear picture of how the person is doing over time.
              </p>

              <div>
                <p className="font-semibold text-warmstone-900 mb-1">Write what you observed, not what you assume.</p>
                <p className="leading-relaxed text-warmstone-600">
                  Describe what you saw, heard, or measured. Instead of &ldquo;seemed a bit off&rdquo;, write &ldquo;quieter than usual and ate only half their lunch&rdquo;. Instead of &ldquo;was difficult&rdquo;, write &ldquo;declined help with washing and asked to be left alone&rdquo;.
                </p>
              </div>

              <div>
                <p className="font-semibold text-warmstone-900 mb-1">Be specific.</p>
                <p className="leading-relaxed text-warmstone-600">
                  Vague notes aren&apos;t useful to anyone. Say how much was eaten, which medications were given, and how much support was needed. Not just that something happened.
                </p>
              </div>

              <div>
                <p className="font-semibold text-warmstone-900 mb-1">Record the good as well as the bad.</p>
                <p className="leading-relaxed text-warmstone-600">
                  If someone had a great day, write that down. Positive patterns matter just as much as concerns.
                </p>
              </div>

              <div>
                <p className="font-semibold text-warmstone-900 mb-1">Write it as soon as you can.</p>
                <p className="leading-relaxed text-warmstone-600">
                  Notes written straight after are more accurate than ones written from memory hours later.
                </p>
              </div>

              <div>
                <p className="font-semibold text-warmstone-900 mb-1">Use the handover section for anything urgent.</p>
                <p className="leading-relaxed text-warmstone-600">
                  If there&apos;s something the next person needs to know before their next visit, put it in concerns. Not buried in general notes.
                </p>
              </div>

              <div>
                <p className="font-semibold text-warmstone-900 mb-2">Examples</p>
                <div className="border border-warmstone-200 rounded-md overflow-hidden text-xs">
                  <div className="grid grid-cols-2 bg-warmstone-50 px-3 py-2 font-semibold text-warmstone-600 border-b border-warmstone-200">
                    <span>Instead of...</span>
                    <span>Write...</span>
                  </div>
                  {[
                    ["Had a good day", "In good spirits all morning, chatted happily, ate all of lunch"],
                    ["Ate some food", "Ate about half of dinner, said she wasn't very hungry"],
                    ["Took medication", "Took morning tablets with breakfast, no issues"],
                    ["A bit confused", "Unsure what day it was, asked twice where her sister was"],
                    ["Refused personal care", "Declined shower, said she was too tired. Assisted with a wash instead"],
                  ].map(([bad, good]) => (
                    <div key={bad} className="grid grid-cols-2 px-3 py-2.5 border-b border-warmstone-100 last:border-0 leading-relaxed">
                      <span className="text-warmstone-500 pr-2">{bad}</span>
                      <span className="text-warmstone-800">{good}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
