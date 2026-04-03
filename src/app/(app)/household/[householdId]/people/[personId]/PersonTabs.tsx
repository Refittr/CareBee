"use client";

import Link from "next/link";
import { useSelectedLayoutSegment, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const STATIC_TABS = [
  { label: "Overview", segment: null },
  { label: "Conditions", segment: "conditions" },
  { label: "Medications", segment: "medications" },
  { label: "Allergies", segment: "allergies" },
  { label: "Appointments", segment: "appointments" },
  { label: "Calendar", segment: "calendar" },
  { label: "Test Results", segment: "test-results" },
  { label: "Documents", segment: "documents" },
  { label: "Notes", segment: "notes" },
  { label: "Insights", segment: "insights" },
  { label: "Contacts", segment: "contacts" },
  { label: "Waiting lists", segment: "waiting-lists" },
  { label: "Entitlements", segment: "entitlements" },
  { label: "Letters", segment: "letters" },
];

// Tabs always visible on mobile — chosen for daily use
const MOBILE_PRIMARY_SEGMENTS = [null, "insights", "calendar", "documents"];

export function PersonTabs({ baseUrl, dailyCareEnabled }: { baseUrl: string; dailyCareEnabled?: boolean }) {
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const tabs = [
    ...STATIC_TABS,
    ...(dailyCareEnabled ? [{ label: "Daily care", segment: "daily-care" }] : []),
  ];

  const primaryTabs = tabs.filter((t) => MOBILE_PRIMARY_SEGMENTS.includes(t.segment));
  const overflowTabs = tabs.filter((t) => !MOBILE_PRIMARY_SEGMENTS.includes(t.segment));

  // Active tab is in overflow — mark the More button as active
  const overflowActive = overflowTabs.some((t) => t.segment === segment);

  // Close dropdown on navigation
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [moreOpen]);

  const tabClass = (isActive: boolean) => [
    "px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors min-h-[44px] flex items-center",
    isActive
      ? "border-honey-400 text-warmstone-900"
      : "border-transparent text-warmstone-600 hover:text-warmstone-900 hover:border-warmstone-200",
  ].join(" ");

  return (
    <nav
      className="border-b border-warmstone-100 -mx-4 md:mx-0"
      aria-label="Person tabs"
    >
      {/* ── MOBILE: primary tabs + More ───────────────────────────────────── */}
      <div className="flex md:hidden">
        {/* Scrollable primary tabs — More button must stay outside this div or the dropdown gets clipped */}
        <div className="flex overflow-x-auto scrollbar-none flex-1">
          {primaryTabs.map(({ label, segment: tabSegment }) => {
            const href = tabSegment ? `${baseUrl}/${tabSegment}` : baseUrl;
            const isActive = segment === tabSegment;
            return (
              <Link key={label} href={href} className={tabClass(isActive)}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* More button — outside scroll container so dropdown is not clipped */}
        <div ref={moreRef} className="relative shrink-0">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={tabClass(overflowActive || moreOpen)}
          >
            <span className="flex items-center gap-1">
              More
              <ChevronDown
                size={13}
                className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          {/* Dropdown */}
          {moreOpen && (
            <div className="absolute top-full right-0 z-50 bg-warmstone-white border border-warmstone-200 rounded-xl shadow-lg py-1 min-w-[160px]">
              {overflowTabs.map(({ label, segment: tabSegment }) => {
                const href = tabSegment ? `${baseUrl}/${tabSegment}` : baseUrl;
                const isActive = segment === tabSegment;
                return (
                  <Link
                    key={label}
                    href={href}
                    className={[
                      "flex items-center px-4 py-2.5 text-sm font-semibold transition-colors min-h-[44px]",
                      isActive
                        ? "text-warmstone-900 bg-honey-50"
                        : "text-warmstone-600 hover:text-warmstone-900 hover:bg-warmstone-50",
                    ].join(" ")}
                  >
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-honey-400 shrink-0 mr-2" />
                    )}
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP: all tabs in scrollable row ───────────────────────────── */}
      <div className="hidden md:flex overflow-x-auto scrollbar-none flex-wrap gap-0">
        {tabs.map(({ label, segment: tabSegment }) => {
          const href = tabSegment ? `${baseUrl}/${tabSegment}` : baseUrl;
          const isActive = segment === tabSegment;
          return (
            <Link key={label} href={href} className={tabClass(isActive)}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
