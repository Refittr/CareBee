import type { Appointment } from "@/lib/types/database";

function escapeIcalText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC 5545: lines longer than 75 octets must be folded with CRLF + whitespace
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

function formatIcalDateTime(isoString: string): string {
  const d = new Date(isoString);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

export function generateIcs(appt: Appointment): string {
  const dtStart = formatIcalDateTime(appt.appointment_date);
  const dtEnd = formatIcalDateTime(
    new Date(new Date(appt.appointment_date).getTime() + 60 * 60 * 1000).toISOString()
  );

  const descParts: string[] = [];
  if (appt.professional_name) descParts.push(`With: ${appt.professional_name}`);
  if (appt.department) descParts.push(`Department: ${appt.department}`);
  if (appt.trust_or_service) descParts.push(`Service: ${appt.trust_or_service}`);
  if (appt.notes_before) descParts.push(`Notes: ${appt.notes_before}`);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareBee//mycarebee.co.uk//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:appointment-${appt.id}@mycarebee.co.uk`,
    `DTSTAMP:${formatIcalDateTime(new Date().toISOString())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${escapeIcalText(appt.title)}`),
  ];

  if (descParts.length > 0) {
    lines.push(foldLine(`DESCRIPTION:${escapeIcalText(descParts.join("\n"))}`));
  }

  if (appt.location) {
    lines.push(foldLine(`LOCATION:${escapeIcalText(appt.location)}`));
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

export async function downloadOrShareIcs(appt: Appointment): Promise<void> {
  const icsContent = generateIcs(appt);
  const filename = `${appt.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });

  // On mobile, prefer the Web Share API so the OS opens it directly in a calendar app
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: "text/calendar;charset=utf-8" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: appt.title });
        return;
      } catch (e) {
        // User cancelled - do nothing; any other error falls through to download
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
  }

  // Fall back to a standard browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
