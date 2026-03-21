import type { DocumentType } from "@/lib/types/database";

/** Formats NHS number with spaces: "123 456 7890" */
export function formatNHSNumber(nhs: string | null | undefined): string {
  if (!nhs) return "";
  const digits = nhs.replace(/\D/g, "");
  if (digits.length !== 10) return nhs;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** Returns initials from a full name: "Claire Davies" => "CD" */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  discharge_summary: "Discharge Summary",
  prescription: "Prescription",
  test_result: "Test Result",
  appointment_letter: "Appointment Letter",
  benefit_letter: "Benefit Letter",
  poa_document: "POA Document",
  care_plan: "Care Plan",
  insurance: "Insurance",
  other: "Other",
};

/** Converts "discharge_summary" to "Discharge Summary" */
export function formatDocumentType(type: DocumentType | string): string {
  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type;
}

/** Truncates text with "..." if it exceeds maxLength */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/** Formats a file size in bytes to human-readable string */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns "82 years old" or "" if no DOB */
export function formatAge(age: number | null | undefined): string {
  if (age === null || age === undefined) return "";
  return `${age} years old`;
}
