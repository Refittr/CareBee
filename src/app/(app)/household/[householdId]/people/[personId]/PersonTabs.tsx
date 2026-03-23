"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

const tabs = [
  { label: "Overview", segment: null },
  { label: "Conditions", segment: "conditions" },
  { label: "Medications", segment: "medications" },
  { label: "Allergies", segment: "allergies" },
  { label: "Appointments", segment: "appointments" },
  { label: "Test Results", segment: "test-results" },
  { label: "Documents", segment: "documents" },
  { label: "Insights", segment: "insights" },
  { label: "Contacts", segment: "contacts" },
];

export function PersonTabs({ baseUrl }: { baseUrl: string }) {
  const segment = useSelectedLayoutSegment();

  return (
    <nav
      className="flex flex-wrap gap-0 -mx-4 md:mx-0 border-b border-warmstone-100"
      aria-label="Person tabs"
    >
      {tabs.map(({ label, segment: tabSegment }) => {
        const href = tabSegment ? `${baseUrl}/${tabSegment}` : baseUrl;
        const isActive = segment === tabSegment;
        return (
          <Link
            key={label}
            href={href}
            className={[
              "px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors min-h-[44px] flex items-center",
              isActive
                ? "border-honey-400 text-warmstone-900"
                : "border-transparent text-warmstone-600 hover:text-warmstone-900 hover:border-warmstone-200",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
