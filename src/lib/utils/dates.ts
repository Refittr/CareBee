const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

/** Returns "14 March 2025" */
export function formatDateUK(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = parseDate(date);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Returns "14/03/2025" */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = parseDate(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

/** Returns "Thursday 14 April 2025, 10:30am" */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = parseDate(date);
  const dayName = DAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${dayName} ${day} ${month} ${year}, ${hour12}:${minutes}${ampm}`;
}

/** Returns age in full years */
export function calculateAge(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const birth = parseDate(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Returns "3 hours ago", "2 days ago", etc. */
export function getRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = parseDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

/** Converts "2025-03-14" to "14/03/2025" for input display */
export function isoToDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Converts "14/03/2025" to "2025-03-14" for storage */
export function displayDateToIso(display: string | null | undefined): string {
  if (!display) return "";
  const parts = display.split("/");
  if (parts.length !== 3) return display;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}
