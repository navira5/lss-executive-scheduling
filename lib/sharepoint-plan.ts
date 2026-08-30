import { buildAssumptions, buildBaseDecisionItems, buildMeetingTemplates } from "@/data/source-data";
import { generateCalendarPlan } from "@/lib/scheduling";
import type {
  GenerationRule,
  HolidayConstraint,
  MeetingCategory,
  MeetingTemplate,
  RuleStatus,
  ScenarioSettings,
} from "@/lib/types";
import type { WorkingMeetingRule } from "@/lib/plan-year";

export type SharePointFields = Record<string, unknown>;

export interface SharePointPlanResult {
  plan: ReturnType<typeof generateCalendarPlan>;
  warnings: string[];
}

const DEFAULT_SETTINGS: ScenarioSettings = {
  boardScenario: "recent_direction",
  allStaffPattern: "detailed_calendar",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SHAREPOINT_CADENCE: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
  every_other_month: "Every other month",
  quarterly: "Quarterly",
  semiannual: "Semi-Annual",
};

const SHAREPOINT_RULE_STATUS: Record<RuleStatus, string> = {
  confirmed: "Confirmed",
  "2026_baseline": "2026 baseline",
  needs_validation: "Needs validation",
  open_question: "Open Question",
};

function text(fields: SharePointFields, ...names: string[]): string {
  for (const name of names) {
    const value = fields[name];
    if (value === null || value === undefined) continue;
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
  }
  return "";
}

function intValue(fields: SharePointFields, fallback: number, ...names: string[]): number {
  const value = Number(text(fields, ...names));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isoDate(value: string): string | null {
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);
  return null;
}

function startTime(value: string): string | null {
  if (!value) return null;
  const hhmm = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) {
    return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
  }
  return null;
}

function category(value: string, fallback: MeetingCategory): MeetingCategory {
  switch (value.toLowerCase()) {
    case "board":
      return "board";
    case "committee":
      return "committee";
    case "executive":
      return "executive";
    case "organization":
      return "organization";
    default:
      return fallback;
  }
}

function ruleStatus(value: string, fallback: RuleStatus): RuleStatus {
  const normalized = value.toLowerCase().replaceAll(" ", "_");
  switch (normalized) {
    case "confirmed":
      return "confirmed";
    case "2026_baseline":
      return "2026_baseline";
    case "needs_validation":
      return "needs_validation";
    case "open_question":
      return "open_question";
    default:
      return fallback;
  }
}

function flexibility(value: string, fallback: MeetingTemplate["flexibility"]): MeetingTemplate["flexibility"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("fixed") || normalized.includes("executive approval required")) return "protected";
  if (normalized.includes("approval")) return "conditional";
  if (normalized.includes("movable") || normalized.includes("preferred")) return "flexible";
  return fallback;
}

function attendanceRule(value: string, fallback: string): string {
  if (value === "Full required") return "Full attendance required";
  if (value === "Core required") return "Core attendance required";
  if (value === "Preferred") return "To confirm";
  return value || fallback;
}

function ordinal(value: string, fallback: number): number {
  const normalized = value.toLowerCase();
  if (normalized === "last") return -1;
  if (normalized.startsWith("1")) return 1;
  if (normalized.startsWith("2")) return 2;
  if (normalized.startsWith("3")) return 3;
  if (normalized.startsWith("4")) return 4;
  if (normalized.startsWith("5")) return 5;
  return fallback;
}

function weekday(value: string, fallback: number): number {
  const normalized = value.toLowerCase();
  const index = WEEKDAYS.findIndex((day) => day.toLowerCase() === normalized);
  return index >= 0 ? index : fallback;
}

function extractNoteSegment(notes: string, label: string): string {
  const marker = `${label}:`;
  const start = notes.indexOf(marker);
  if (start < 0) return "";
  const after = notes.slice(start + marker.length);
  const end = after.indexOf(" | ");
  return (end >= 0 ? after.slice(0, end) : after).trim();
}

function monthsFromText(value: string): number[] {
  if (!value) return [];
  if (value.toLowerCase() === "all months") return MONTHS.map((_, index) => index + 1);
  return MONTHS
    .map((month, index) => value.toLowerCase().includes(month.toLowerCase()) ? index + 1 : null)
    .filter((month): month is number => month !== null);
}

function fixedDatesFromNotes(notes: string): string[] {
  return [...notes.matchAll(/\b2027-\d{2}-\d{2}\b/g)].map((match) => match[0]);
}

function generationFor(fields: SharePointFields, fallback: GenerationRule): GenerationRule {
  const notes = text(fields, "Notes");
  const cadence = text(fields, "Cadence").toLowerCase();
  const frequency = extractNoteSegment(notes, "Frequency detail");
  const defaults = text(fields, "DefaultMonth") || extractNoteSegment(notes, "Default month(s)");
  const months = monthsFromText(defaults);
  const fixedDates = fixedDatesFromNotes(frequency);
  const fallbackWeekday = "weekday" in fallback ? fallback.weekday : 2;
  const fallbackOrdinal = "ordinal" in fallback ? fallback.ordinal : 2;
  const nextWeekday = weekday(text(fields, "DayOfWeek"), fallbackWeekday);
  const nextOrdinal = ordinal(text(fields, "WeekOfMonth"), fallbackOrdinal);

  if (fixedDates.length) return { type: "fixed_dates", dates: fixedDates };
  if (cadence === "weekly") return { type: "weekly", weekday: nextWeekday };
  if (frequency.toLowerCase().includes("following day")) {
    return { type: "two_day_nth_weekday", months, ordinal: nextOrdinal, weekday: nextWeekday };
  }
  if (frequency.toLowerCase().includes("final date rule needed")) {
    return { type: "month_placeholder", months };
  }
  if (!months.length && fallback.type === "month_placeholder") return fallback;
  if (!months.length && "months" in fallback) return { ...fallback, months: fallback.months };
  return { type: "nth_weekday", months, ordinal: nextOrdinal, weekday: nextWeekday };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "meeting";
}

function abbreviation(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 7)
    .toUpperCase();
}

function assumptionIds(notes: string, fallback: string[] = []): string[] {
  const segment = extractNoteSegment(notes, "Assumptions");
  if (!segment) return fallback;
  return segment.split(";").map((item) => item.trim()).filter(Boolean);
}

export function meetingTemplatesFromSharePoint(
  rows: SharePointFields[],
  settings: ScenarioSettings = DEFAULT_SETTINGS,
): { templates: MeetingTemplate[]; warnings: string[] } {
  const defaults = buildMeetingTemplates(settings);
  const byName = new Map(defaults.map((template) => [template.name, template]));
  const warnings: string[] = [];

  const templates = rows.map((fields) => {
    const name = text(fields, "Title", "LinkTitle") || "Untitled meeting";
    const fallback = byName.get(name);
    if (!fallback) warnings.push(`Using inferred defaults for unknown SharePoint meeting "${name}".`);
    const base: MeetingTemplate = fallback ?? {
      id: slug(name),
      abbreviation: abbreviation(name),
      name,
      category: "organization",
      purpose: "Purpose needs confirmation.",
      owner: "To confirm",
      attendeeGroup: "To confirm",
      cadence: "No recurring cadence selected",
      durationMinutes: 60,
      startTime: null,
      modality: "To confirm",
      location: "To confirm",
      attendanceRequirement: "To confirm",
      flexibility: "conditional",
      ruleStatus: "open_question",
      generation: { type: "nth_weekday", months: [], ordinal: 2, weekday: 2 },
      priority: 50,
      sourceReferences: [{ label: "SharePoint", detail: "Created from the LSS Meeting Types list." }],
    };
    const notes = text(fields, "Notes");
    return {
      ...base,
      name,
      category: category(text(fields, "Category"), base.category),
      purpose: text(fields, "Purpose", "MeetingCategory") || base.purpose,
      owner: text(fields, "Leader") || base.owner,
      attendeeGroup: text(fields, "Attendees") || base.attendeeGroup,
      cadence: text(fields, "Cadence") || base.cadence,
      durationMinutes: intValue(fields, base.durationMinutes, "DurationMinutes", "Duration"),
      startTime: startTime(text(fields, "PreferredTime")) ?? base.startTime,
      modality: text(fields, "Modality") || base.modality,
      location: text(fields, "Location") || base.location,
      attendanceRequirement: attendanceRule(text(fields, "AttendanceRule"), base.attendanceRequirement),
      flexibility: flexibility(text(fields, "Flexibility"), base.flexibility),
      ruleStatus: ruleStatus(text(fields, "RuleStatus"), base.ruleStatus),
      generation: generationFor(fields, base.generation),
      sourceReferences: [{ label: "SharePoint: LSS Meeting Types", detail: notes || "Imported from Microsoft Lists." }],
      assumptionIds: assumptionIds(notes, base.assumptionIds),
      validationNote: base.validationNote,
    };
  });

  return { templates, warnings };
}

export function holidaysFromSharePoint(rows: SharePointFields[]): HolidayConstraint[] {
  return rows
    .map((fields) => {
      const date = isoDate(text(fields, "Date"));
      const name = text(fields, "Title", "LinkTitle") || "Unnamed closure";
      if (!date) return null;
      return {
        date,
        name,
        status: text(fields, "Status") === "verified_federal"
          ? "verified_federal"
          : "projected_lss",
      } satisfies HolidayConstraint;
    })
    .filter((holiday): holiday is HolidayConstraint => holiday !== null)
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function calendarPlanFromSharePoint(
  meetingRows: SharePointFields[],
  holidayRows: SharePointFields[],
  settings: ScenarioSettings = DEFAULT_SETTINGS,
): SharePointPlanResult {
  const { templates, warnings } = meetingTemplatesFromSharePoint(meetingRows, settings);
  const holidays = holidaysFromSharePoint(holidayRows);
  const plan = generateCalendarPlan(settings, [], {}, {
    templates,
    holidays,
    assumptions: buildAssumptions(settings),
    decisions: buildBaseDecisionItems(settings),
  });
  return {
    plan: {
      ...plan,
      label: "2027 Working Draft — SharePoint rules",
    },
    warnings,
  };
}

function cadenceForWrite(rule: WorkingMeetingRule, fallback: string): string {
  if (rule.cadencePreset && rule.cadencePreset !== "custom") {
    return SHAREPOINT_CADENCE[rule.cadencePreset] ?? fallback;
  }
  if (rule.annualCount === 1) return "Annual";
  if (rule.annualCount === 2) return "Semi-Annual";
  if (rule.annualCount === 3) return "3x/Year";
  if (rule.annualCount === 4) return "Quarterly";
  if (rule.annualCount === 6) return "Every other month";
  if (rule.annualCount === 12) return "Monthly";
  if (rule.annualCount === 26) return "Bi-Weekly";
  if (rule.annualCount === 52) return "Weekly";
  return rule.cadence || fallback;
}

function ordinalForWrite(value: number | undefined): string | undefined {
  if (value === -1) return "Last";
  if (value && value >= 1 && value <= 4) return `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"}`;
  return undefined;
}

function modalityForWrite(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().replaceAll(" ", "-");
  if (normalized === "in-person" || normalized === "virtual" || normalized === "hybrid") {
    return normalized === "in-person" ? "In-person" : normalized[0].toUpperCase() + normalized.slice(1);
  }
  return undefined;
}

function plannedMonthsForWrite(rule: WorkingMeetingRule): number[] | null {
  const count = rule.annualCount;
  const startMonth = Math.max(1, Math.min(12, rule.startMonth ?? 1));
  if (!count || count > 12 || rule.cadencePreset === "weekly" || rule.cadencePreset === "biweekly") {
    return count ? MONTHS.map((_, index) => index + 1) : null;
  }
  const interval = rule.cadencePreset === "monthly" ? 1
    : rule.cadencePreset === "every_other_month" ? 2
      : rule.cadencePreset === "quarterly" ? 3
        : rule.cadencePreset === "semiannual" ? 6
          : null;
  return Array.from({ length: Math.min(count, 12) }, (_, index) => {
    const offset = interval === null ? Math.floor((index * 12) / count) : index * interval;
    return ((startMonth - 1 + offset) % 12) + 1;
  }).sort((left, right) => left - right);
}

function replaceNoteSegment(notes: string, label: string, value: string): string {
  const segments = notes.split(" | ").map((segment) => segment.trim()).filter(Boolean);
  const next = `${label}: ${value}`;
  const index = segments.findIndex((segment) => segment.startsWith(`${label}:`));
  if (index >= 0) segments[index] = next;
  else segments.push(next);
  return segments.join(" | ");
}

export function sharePointRuleFields(
  template: MeetingTemplate,
  rule: WorkingMeetingRule,
  currentNotes?: string,
): SharePointFields {
  const fields: SharePointFields = {
    Cadence: cadenceForWrite(rule, template.cadence),
  };
  if (rule.weekday !== undefined && rule.weekday >= 1 && rule.weekday <= 5) fields.DayOfWeek = WEEKDAYS[rule.weekday];
  const week = ordinalForWrite(rule.ordinal);
  if (week) fields.WeekOfMonth = week;
  if (rule.startTime !== undefined) fields.PreferredTime = rule.startTime ? `2027-01-01 ${rule.startTime}` : "";
  if (rule.durationMinutes !== undefined) fields.Duration = rule.durationMinutes;
  if (rule.location !== undefined) fields.Location = rule.location;
  const modality = modalityForWrite(rule.modality);
  if (modality) fields.Modality = modality;
  if (rule.attendees !== undefined) fields.Attendees = rule.attendees.join("; ");
  if (rule.owner !== undefined) fields.Leader = rule.owner;
  if (rule.minimumLeadDays !== undefined) {
    fields.MeetingDependency = `At least ${rule.minimumLeadDays} calendar days before the related Board decision.`;
  }
  const plannedMonths = plannedMonthsForWrite(rule);
  if (currentNotes !== undefined && plannedMonths) {
    const monthLabel = plannedMonths.length === 12
      ? "All months"
      : plannedMonths.map((month) => MONTHS[month - 1]).join("; ");
    fields.Notes = replaceNoteSegment(currentNotes, "Default month(s)", monthLabel);
  }
  return fields;
}

export function newSharePointMeetingFields(
  template: MeetingTemplate,
  rule: WorkingMeetingRule,
): SharePointFields {
  return {
    Title: template.name,
    Category: template.category[0].toUpperCase() + template.category.slice(1),
    MeetingCategory: template.purpose,
    Leader: rule.owner ?? template.owner,
    Attendees: (rule.attendees ?? [template.attendeeGroup]).join("; "),
    Cadence: cadenceForWrite(rule, template.cadence),
    Duration: rule.durationMinutes ?? template.durationMinutes,
    PreferredTime: (rule.startTime ?? template.startTime) ? `2027-01-01 ${rule.startTime ?? template.startTime}` : "",
    Location: rule.location ?? template.location,
    ...(modalityForWrite(rule.modality ?? template.modality) ? { Modality: modalityForWrite(rule.modality ?? template.modality) } : {}),
    RuleStatus: SHAREPOINT_RULE_STATUS[template.ruleStatus],
    Notes: "Created from the LSS 2027 Calendar Planner after human confirmation.",
    ...sharePointRuleFields(template, rule),
  };
}
