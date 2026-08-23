import type { MeetingTemplate } from "@/lib/types";

export interface RuleSummaryRow {
  label: string;
  value: string;
  emphasis?: "proposal" | "validation";
}

export interface MeetingRuleSummary {
  title: string;
  rows: RuleSummaryRow[];
}

function timeLabel(time: string | null): string | null {
  if (!time) return null;
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function durationLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hr ${minutes % 60} min`;
  }
  return `${minutes} minutes`;
}

const BOARD_SUMMARIES: Record<string, MeetingRuleSummary> = {
  "full-board": {
    title: "Full Board Meeting",
    rows: [
      { label: "Purpose", value: "Governance, key decisions, and organizational oversight" },
      { label: "Who attends", value: "Full Board" },
      {
        label: "Historical cadence",
        value: "Every other month; generally 2nd Tuesday in Jan, Mar, May, Jul, Sep, and Nov. May 2026 was converted to a retreat.",
      },
      { label: "Historical time", value: "5:00–7:00 PM" },
      { label: "Format", value: "In person" },
      { label: "2027 proposal", value: "4 regular meetings", emphasis: "proposal" },
      {
        label: "Needs validation",
        value: "Meeting months and preferred weekday",
        emphasis: "validation",
      },
    ],
  },
  "board-retreat": {
    title: "Full Board Retreat",
    rows: [
      { label: "Purpose", value: "Extended strategic and governance discussion" },
      { label: "Who attends", value: "Full Board" },
      {
        label: "Historical cadence",
        value: "A regular Full Board meeting was converted to a retreat in 2026",
      },
      { label: "Historical timing", value: "May 2026" },
      { label: "2027 proposal", value: "2 retreats per year", emphasis: "proposal" },
      { label: "Duration", value: "Approximately 5 hours" },
      { label: "Format", value: "In person" },
      { label: "Needs validation", value: "Retreat months", emphasis: "validation" },
    ],
  },
  "critical-checkin": {
    title: "Critical Issue Check-In",
    rows: [
      { label: "Purpose", value: "Short Board touchpoint between Full Board meetings" },
      { label: "Who attends", value: "Full Board" },
      {
        label: "Historical cadence",
        value: "Every other month, generally alternating with Full Board meetings; Feb, Apr, Jun, Aug, Oct, and Dec",
      },
      { label: "Historical time", value: "5:00–5:30 PM" },
      { label: "Format", value: "Virtual" },
      { label: "2027 proposal", value: "6 per year", emphasis: "proposal" },
      {
        label: "Needs validation",
        value: "Whether to continue monthly Board touchpoints",
        emphasis: "validation",
      },
    ],
  },
};

export function ruleSummaryFor(template: MeetingTemplate): MeetingRuleSummary {
  const boardSummary = BOARD_SUMMARIES[template.id];
  if (boardSummary) return boardSummary;

  const rows: RuleSummaryRow[] = [
    { label: "Purpose", value: template.purpose },
    { label: "Who attends", value: template.attendeeGroup },
    { label: "Historical cadence", value: template.cadence },
  ];
  const time = timeLabel(template.startTime);
  if (time) rows.push({ label: "Historical time", value: time });
  rows.push({ label: "Duration", value: durationLabel(template.durationMinutes) });
  rows.push({ label: "Format", value: template.modality });
  if (template.ruleStatus !== "confirmed") {
    rows.push({
      label: "Needs validation",
      value: template.validationNote ?? "Confirm the 2027 cadence, timing, and attendance requirements",
      emphasis: "validation",
    });
  }
  return { title: template.name, rows };
}
