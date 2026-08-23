import { isEventConfirmed, meetingTemplatesForState, resolvePlanEvent } from "@/lib/plan-year";
import type { ImportedCalendarEvent } from "@/lib/calendar-import";
import type { PlanYearState, ResolvedPlanEvent } from "@/lib/plan-year";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function confirmedCalendarEvents(state: PlanYearState): ResolvedPlanEvent[] {
  return state.plan.events
    .filter((event) =>
      !event.isPlaceholder &&
      !state.hiddenEventIds.includes(event.id) &&
      isEventConfirmed(state, event) &&
      event.ruleStatus !== "open_question" &&
      !event.conflicts.some((conflict) => conflict.severity === "blocked"),
    )
    .map((event) => resolvePlanEvent(state, event.id))
    .sort((left, right) => `${left.date}${left.startTime ?? ""}`.localeCompare(`${right.date}${right.startTime ?? ""}`));
}

function icsEscape(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function icsDate(date: string): string {
  return date.replaceAll("-", "");
}

function dateTime(date: string, time: string): string {
  return `${icsDate(date)}T${time.replace(":", "")}00`;
}

function endTime(date: string, time: string, durationMinutes: number): { date: string; time: string } {
  const start = new Date(`${date}T${time}:00`);
  start.setMinutes(start.getMinutes() + durationMinutes);
  return {
    date: start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0"),
    time: String(start.getHours()).padStart(2, "0") + ":" + String(start.getMinutes()).padStart(2, "0"),
  };
}

export function calendarIcs(state: PlanYearState): { contents: string; count: number } {
  const events = confirmedCalendarEvents(state);
  const generatedAt = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LSS Central Ohio//Plan Year 2027//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:LSS Confirmed 2027 Meetings",
  ];
  for (const event of events) {
    lines.push("BEGIN:VEVENT", `UID:${icsEscape(event.id)}@lss-plan-year.local`, `DTSTAMP:${generatedAt}`);
    if (event.startTime) {
      const end = endTime(event.date, event.startTime, event.durationMinutes);
      lines.push(
        `DTSTART;TZID=America/New_York:${dateTime(event.date, event.startTime)}`,
        `DTEND;TZID=America/New_York:${dateTime(end.date, end.time)}`,
      );
    } else {
      const next = new Date(`${event.date}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${icsDate(event.date)}`, `DTEND;VALUE=DATE:${icsDate(next.toISOString().slice(0, 10))}`);
    }
    lines.push(
      `SUMMARY:${icsEscape(event.title)}`,
      `DESCRIPTION:${icsEscape(event.message)}`,
      `LOCATION:${icsEscape(event.location)}`,
      `CATEGORIES:${icsEscape(event.category)}`,
      `X-LSS-ATTENDEES:${icsEscape(event.attendees.join("; "))}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return { contents: `${lines.join("\r\n")}\r\n`, count: events.length };
}

function displayDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function displayTime(time: string | null): string {
  if (!time) return "Time TBD";
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
    .format(new Date(2027, 0, 1, hour, minute));
}

export async function downloadPlanPdf(
  state: PlanYearState,
  importedEvents: ImportedCalendarEvent[],
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 44;
  let y = 48;

  const pageHeader = () => {
    pdf.setFillColor(27, 77, 122);
    pdf.rect(0, 0, pageWidth, 8, "F");
    pdf.setTextColor(27, 77, 122);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("LUTHERAN SOCIAL SERVICES OF CENTRAL OHIO", margin, 28);
  };
  const newPage = () => {
    pdf.addPage();
    pageHeader();
    y = 60;
  };
  const ensure = (height: number) => {
    if (y + height > pageHeight - 40) newPage();
  };
  const text = (value: string, x: number, width: number, size = 9, color: [number, number, number] = [33, 48, 55]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(value, width) as string[];
    pdf.text(lines, x, y);
    y += lines.length * (size + 3);
  };

  pageHeader();
  pdf.setTextColor(28, 47, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("2027 Annual Calendar Plan", margin, y);
  y += 25;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(91, 108, 115);
  pdf.text(`Working plan exported ${new Date().toLocaleString("en-US")}`, margin, y);
  y += 24;

  const confirmed = confirmedCalendarEvents(state);
  const allEvents = state.plan.events
    .filter((event) => !event.isPlaceholder && !state.hiddenEventIds.includes(event.id))
    .map((event) => resolvePlanEvent(state, event.id));
  pdf.setFillColor(243, 247, 245);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 48, 6, 6, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(27, 77, 122);
  pdf.setFontSize(18);
  pdf.text(String(allEvents.length), margin + 14, y + 22);
  pdf.setFontSize(8);
  pdf.text("TOTAL PLANNED", margin + 14, y + 36);
  pdf.setTextColor(42, 157, 110);
  pdf.setFontSize(18);
  pdf.text(String(confirmed.length), margin + 150, y + 22);
  pdf.setFontSize(8);
  pdf.text("ICS-READY", margin + 150, y + 36);
  pdf.setTextColor(224, 122, 47);
  pdf.setFontSize(18);
  pdf.text(String(allEvents.length - confirmed.length), margin + 270, y + 22);
  pdf.setFontSize(8);
  pdf.text("WORKING / UNRESOLVED", margin + 270, y + 36);
  y += 68;

  for (let month = 1; month <= 12; month += 1) {
    const planned = allEvents.filter((event) => Number(event.date.slice(5, 7)) === month);
    const imported = importedEvents.filter((event) => Number(event.date.slice(5, 7)) === month);
    const closures = state.calendarClosures.filter((closure) => Number(closure.date.slice(5, 7)) === month);
    if (!planned.length && !imported.length && !closures.length) continue;
    ensure(34 + (planned.length + imported.length + closures.length) * 28);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(27, 77, 122);
    pdf.text(MONTHS[month - 1], margin, y);
    y += 15;
    pdf.setDrawColor(210, 219, 216);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;
    for (const closure of closures) {
      ensure(27);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(165, 62, 48);
      pdf.text(displayDate(closure.date), margin, y);
      pdf.text(closure.label, margin + 155, y, { maxWidth: 260 });
      pdf.setFontSize(7);
      pdf.text("CLOSED", pageWidth - margin, y, { align: "right" });
      y += 18;
    }
    for (const event of planned) {
      ensure(33);
      const ready = confirmed.some((item) => item.id === event.id);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(33, 48, 55);
      pdf.text(`${displayDate(event.date)} · ${displayTime(event.startTime)}`, margin, y);
      pdf.text(event.title, margin + 155, y, { maxWidth: 260 });
      pdf.setFontSize(7);
      pdf.setTextColor(ready ? 42 : 190, ready ? 125 : 101, ready ? 88 : 34);
      pdf.text(ready ? "CONFIRMED" : "NEEDS VALIDATION", pageWidth - margin, y, { align: "right" });
      y += 12;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(91, 108, 115);
      pdf.text(`${event.durationMinutes} min · ${event.location} · ${event.attendees.join(", ")}`, margin + 155, y, { maxWidth: pageWidth - margin * 2 - 155 });
      y += 15;
    }
    for (const event of imported) {
      ensure(27);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(85, 95, 100);
      pdf.text(`${displayDate(event.date)} · ${displayTime(event.startTime)}`, margin, y);
      pdf.text(event.title, margin + 155, y, { maxWidth: 260 });
      pdf.setFontSize(7);
      pdf.text("OUTLOOK SNAPSHOT", pageWidth - margin, y, { align: "right" });
      y += 17;
    }
    y += 9;
  }

  const unresolvedTemplates = meetingTemplatesForState(state).filter((template) => {
    const events = state.plan.events.filter((event) => event.templateId === template.id && !event.isPlaceholder);
    return events.length === 0 || events.some((event) => !isEventConfirmed(state, event));
  });
  if (unresolvedTemplates.length) {
    ensure(44);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(190, 101, 34);
    pdf.text("Unresolved before calendar import", margin, y);
    y += 20;
    for (const template of unresolvedTemplates) {
      ensure(44);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(33, 48, 55);
      pdf.text(template.name, margin, y);
      y += 12;
      text(template.validationNote ?? (template.ruleStatus === "open_question" ? "No approved recurring rule is documented." : "This planning layer has not been confirmed."), margin + 10, pageWidth - margin * 2 - 10, 8, [91, 108, 115]);
      y += 5;
    }
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(120, 132, 136);
    pdf.text("Working document · Human approval required · No Outlook writes performed", margin, pageHeight - 22);
    pdf.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 22, { align: "right" });
  }
  pdf.save("LSS-2027-Annual-Calendar-Plan.pdf");
}
