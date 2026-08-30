import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAssumptions,
  buildBaseDecisionItems,
  buildMeetingTemplates,
  holidays2027,
} from "@/data/source-data";
import { generateCalendarPlan } from "@/lib/scheduling";
import type { GenerationRule, SourceReference } from "@/lib/types";

const OUT_DIR = "sharepoint-import";
const SETTINGS = {
  boardScenario: "recent_direction",
  allStaffPattern: "detailed_calendar",
} as const;

const EXCLUDED_HOLIDAY_DATES = new Set([
  "2027-02-15",
  "2027-10-11",
  "2027-11-11",
]);

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows: Array<Record<string, unknown>>, headings: string[]): string {
  return [
    headings.join(","),
    ...rows.map((row) => headings.map((heading) => csvEscape(row[heading])).join(",")),
  ].join("\n") + "\n";
}

function tsv(rows: Array<Record<string, unknown>>, headings: string[], includeHeader = true): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    return String(value).replaceAll("\t", " ").replaceAll("\r", " ").replaceAll("\n", " ");
  };
  const body = rows.map((row) => headings.map((heading) => escape(row[heading])).join("\t"));
  return [...(includeHeader ? [headings.join("\t")] : []), ...body].join("\n") + "\n";
}

function monthLabels(months: number[]): string {
  return months.map((month) => MONTHS[month - 1]).join("; ");
}

function ordinalLabel(ordinal?: number): string {
  if (ordinal === undefined) return "";
  if (ordinal === -1) return "Last";
  return ["", "First", "Second", "Third", "Fourth", "Fifth"][ordinal] ?? String(ordinal);
}

function sharePointOrdinalLabel(ordinal?: number): string {
  if (ordinal === undefined) return "";
  if (ordinal === -1) return "Last";
  return ["", "1st", "2nd", "3rd", "4th", "5th"][ordinal] ?? String(ordinal);
}

function ruleFields(rule: GenerationRule): Record<string, string> {
  switch (rule.type) {
    case "weekly":
      return {
        GenerationType: "weekly",
        Months: "All months",
        Ordinal: "",
        DayOfWeek: WEEKDAYS[rule.weekday],
        FixedDates: "",
      };
    case "nth_weekday":
      return {
        GenerationType: "nth_weekday",
        Months: monthLabels(rule.months),
        Ordinal: ordinalLabel(rule.ordinal),
        DayOfWeek: WEEKDAYS[rule.weekday],
        FixedDates: "",
      };
    case "two_day_nth_weekday":
      return {
        GenerationType: "two_day_nth_weekday",
        Months: monthLabels(rule.months),
        Ordinal: ordinalLabel(rule.ordinal),
        DayOfWeek: `${WEEKDAYS[rule.weekday]} and following day`,
        FixedDates: "",
      };
    case "fixed_dates":
      return {
        GenerationType: "fixed_dates",
        Months: monthLabels([...new Set(rule.dates.map((date) => Number(date.slice(5, 7))))]),
        Ordinal: "",
        DayOfWeek: "",
        FixedDates: rule.dates.join("; "),
      };
    case "month_placeholder":
      return {
        GenerationType: "month_placeholder",
        Months: monthLabels(rule.months),
        Ordinal: "",
        DayOfWeek: "",
        FixedDates: "",
      };
  }
}

function categoryLabel(value: string): string {
  return value[0].toUpperCase() + value.slice(1);
}

function modalityLabel(value: string): string {
  if (value === "In person") return "In-person";
  return value;
}

function sharePointRuleFields(rule: GenerationRule): Record<string, string> {
  const fields = ruleFields(rule);
  return {
    DefaultMonth: fields.Months,
    DayOfWeek: fields.DayOfWeek,
    WeekOfMonth: "ordinal" in rule ? sharePointOrdinalLabel(rule.ordinal) : "",
  };
}

function frequencyDetail(rule: GenerationRule, cadence: string): string {
  switch (rule.type) {
    case "weekly":
      return "Every week";
    case "nth_weekday":
      return `${ruleFields(rule).Ordinal} ${WEEKDAYS[rule.weekday]} in ${monthLabels(rule.months)}`;
    case "two_day_nth_weekday":
      return `${ruleFields(rule).Ordinal} ${WEEKDAYS[rule.weekday]} and following day in ${monthLabels(rule.months)}`;
    case "fixed_dates":
      return `Fixed dates: ${rule.dates.join("; ")}`;
    case "month_placeholder":
      return `Month reserved only; final date rule needed. ${cadence}`;
  }
}

const dependencies: Record<string, { upstream: string; downstream: string; holiday: string }> = {
  "full-board": {
    upstream: "Board calendar structure must be approved.",
    downstream: "Board committees and executive planning should work around confirmed Board dates.",
    holiday: "Do not schedule on observed holidays; move to nearest valid business day for draft review.",
  },
  "board-retreat": {
    upstream: "Board retreat months must be approved.",
    downstream: "Regular Board meeting pattern and committee calendar should work around retreat dates.",
    holiday: "Do not schedule on observed holidays; select a business-day alternative.",
  },
  "critical-checkin": {
    upstream: "Board calendar structure must be approved.",
    downstream: "Maintains Board touchpoints between regular meetings.",
    holiday: "Do not schedule on observed holidays; move to nearest valid business day for draft review.",
  },
  "executive-committee": {
    upstream: "Board meeting months should be confirmed first.",
    downstream: "Can shape items that need Board-level action.",
    holiday: "Do not schedule on observed holidays; select a business-day alternative.",
  },
  "finance-committee": {
    upstream: "Financial data-ready dates and 2027 budget deadline are required.",
    downstream: "Board decisions that require completed financial review.",
    holiday: "Do not schedule on observed holidays; finance-to-Board deadline may override normal cadence.",
  },
  "health-programs": {
    upstream: "Committee purpose, outputs, attendees, and Board dependencies need validation.",
    downstream: "Potential Board program decisions.",
    holiday: "Do not schedule on observed holidays; select a business-day alternative.",
  },
  "talent-risk": {
    upstream: "Committee purpose, structure, outputs, and 2027 cadence need validation.",
    downstream: "Potential Board talent or risk decisions.",
    holiday: "Do not schedule on observed holidays; select a business-day alternative.",
  },
  "nominations-committee": {
    upstream: "Recruitment, succession, or Board nomination deadlines.",
    downstream: "Board recruitment and nominations decisions.",
    holiday: "Do not schedule on observed holidays; schedule only when business need is confirmed.",
  },
  "program-committee": {
    upstream: "Committee purpose, participants, and cadence must be defined.",
    downstream: "Potential Board or program governance decisions.",
    holiday: "Do not schedule on observed holidays; schedule only when business need is confirmed.",
  },
  "board-orientation": {
    upstream: "New Board member onboarding need must be confirmed.",
    downstream: "New Board member readiness.",
    holiday: "Do not schedule on observed holidays; use another business day in the orientation window.",
  },
  "executive-team": {
    upstream: "None documented.",
    downstream: "Executive decisions and direction for organization-wide planning.",
    holiday: "Automatically move Monday federal holiday occurrences to the nearest valid business day for draft review.",
  },
  "executive-retreat": {
    upstream: "Quarterly results and planning inputs.",
    downstream: "Quarterly priorities / Rocks.",
    holiday: "Do not schedule on observed holidays or projected LSS closures unless explicitly approved.",
  },
  "leadership-team": {
    upstream: "Executive Team direction.",
    downstream: "Program and functional leadership alignment.",
    holiday: "Do not schedule on observed holidays; select a business-day alternative.",
  },
  "leadership-retreat": {
    upstream: "Executive priorities and retreat timing must be coordinated.",
    downstream: "Organizational strategy and priority alignment.",
    holiday: "Do not schedule on observed holidays; retreat may replace monthly Leadership meeting if approved.",
  },
  "all-staff": {
    upstream: "Leadership message and source pattern must be validated.",
    downstream: "Organization-wide communication.",
    holiday: "Do not schedule on observed holidays; select a business-day alternative.",
  },
  "program-briefing": {
    upstream: "Program Director date-selection rule and event count required.",
    downstream: "Program updates and mission/priorities communication.",
    holiday: "Reserve month only until final date rule is supplied.",
  },
  "supervisory-team": {
    upstream: "Frequency must be validated: three meetings vs quarterly.",
    downstream: "Supervisor communication cascade.",
    holiday: "Do not schedule on observed holidays; select a business-day alternative.",
  },
  operations: {
    upstream: "Financial results, service delivery, KPI, and quality data availability.",
    downstream: "Operations review and potential leadership action.",
    holiday: "Do not schedule on observed holidays; data dependencies may override normal cadence.",
  },
  bvr: {
    upstream: "Program-to-slot map is required.",
    downstream: "Program-level financial deep dives.",
    holiday: "Reserve month only until program owner and slot mapping are supplied.",
  },
  "internal-risk": {
    upstream: "Purpose, owner, attendees, representation, and Board relationship must be defined.",
    downstream: "Risk governance actions once defined.",
    holiday: "Do not schedule on observed holidays; no final rule until governance relationship is confirmed.",
  },
};

function cadenceChoice(rule: GenerationRule): string {
  switch (rule.type) {
    case "weekly":
      return "Weekly";
    case "fixed_dates":
      return rule.dates.length === 2 ? "Semi-Annual" : "Quarterly";
    case "month_placeholder":
      if (rule.months.length === 12) return "Monthly";
      if (rule.months.length === 4) return "Quarterly";
      return "Annual";
    case "two_day_nth_weekday":
      return "Quarterly";
    case "nth_weekday":
      if (rule.months.length === 12) return "Monthly";
      if (rule.months.length === 6) return "Every other month";
      if (rule.months.length === 4) return "Quarterly";
      if (rule.months.length === 3) return "3x/Year";
      if (rule.months.length === 2) return "Semi-Annual";
      if (rule.months.length === 1) return "Annual";
      return "Annual";
  }
}

function attendanceChoice(value: string): string {
  if (value === "Full attendance required") return "Full required";
  if (value === "Core attendance required") return "Core required";
  if (value === "Informational") return "Informational";
  return "Preferred";
}

function flexibilityChoice(value: string): string {
  if (value === "protected") return "Fixed — Executive approval required to move";
  if (value === "conditional") return "Movable with approval";
  return "Movable";
}

function ruleStatusChoice(value: string): string {
  switch (value) {
    case "confirmed":
      return "Confirmed";
    case "2026_baseline":
      return "2026 baseline";
    case "needs_validation":
      return "Needs validation";
    case "open_question":
      return "Open Question";
    default:
      return value;
  }
}

function preferredTimeForDateTimeColumn(time: string | null): string {
  if (!time) return "";
  return `2027-01-01 ${time}`;
}

function sourceText(references: SourceReference[]): string {
  return references.map((reference) => `${reference.label}: ${reference.detail}`).join(" | ");
}

mkdirSync(OUT_DIR, { recursive: true });

const templates = buildMeetingTemplates(SETTINGS);
const plan = generateCalendarPlan(SETTINGS);
const assumptions = buildAssumptions(SETTINGS);
const decisions = buildBaseDecisionItems(SETTINGS);
const sharePointHolidays = holidays2027.filter(
  (holiday) => !EXCLUDED_HOLIDAY_DATES.has(holiday.date),
);

const existingListHeadings = [
  "Title",
  "Category",
  "Purpose",
  "Leader",
  "Attendees",
  "Cadence",
  "DayOfWeek",
  "WeekOfMonth",
  "Modality",
  "AttendanceRule",
  "Flexibility",
  "RuleStatus",
  "Location",
  "PreferredTime",
  "DurationMinutes",
  "MeetingDependency",
  "Notes",
];

const existingListRows = templates.map((template) => {
  const dependency = dependencies[template.id] ?? {
    upstream: "To confirm.",
    downstream: "To confirm.",
    holiday: "Do not schedule on observed holidays; select a business-day alternative.",
  };
  const rules = sharePointRuleFields(template.generation);
  return {
    Title: template.name,
    Category: categoryLabel(template.category),
    Purpose: template.purpose,
    Leader: template.owner,
    Attendees: template.attendeeGroup,
    Cadence: cadenceChoice(template.generation),
    DayOfWeek: rules.DayOfWeek.replace(" and following day", ""),
    WeekOfMonth: rules.WeekOfMonth,
    Modality: template.modality === "To confirm" ? "Hybrid" : modalityLabel(template.modality),
    AttendanceRule: attendanceChoice(template.attendanceRequirement),
    Flexibility: flexibilityChoice(template.flexibility),
    RuleStatus: ruleStatusChoice(template.ruleStatus),
    Location: template.location,
    PreferredTime: preferredTimeForDateTimeColumn(template.startTime),
    DurationMinutes: template.durationMinutes,
    MeetingDependency: dependency.upstream,
    Notes: [
      `Cadence detail: ${template.cadence}`,
      `Frequency detail: ${frequencyDetail(template.generation, template.cadence)}`,
      `Default month(s): ${rules.DefaultMonth}`,
      template.modality === "To confirm" ? "Modality to confirm; Hybrid used as temporary SharePoint choice value." : "",
      template.attendanceRequirement === "To confirm" ? "Attendance rule to confirm; Preferred used as temporary SharePoint choice value." : "",
      `Downstream dependency: ${dependency.downstream}`,
      `Holiday handling: ${dependency.holiday}`,
      template.validationNote,
      template.assumptionIds?.length ? `Assumptions: ${template.assumptionIds.join("; ")}` : "",
      sourceText(template.sourceReferences),
    ].filter(Boolean).join(" | "),
  };
});

writeFileSync(
  join(OUT_DIR, "lss-meeting-types-existing-list.csv"),
  csv(existingListRows, existingListHeadings),
);

writeFileSync(
  join(OUT_DIR, "lss-meeting-types-existing-list-paste.tsv"),
  tsv(existingListRows, existingListHeadings, false),
);

writeFileSync(
  join(OUT_DIR, "lss-meeting-types-sharepoint.csv"),
  csv(
    templates.map((template) => {
      const dependency = dependencies[template.id] ?? {
        upstream: "To confirm.",
        downstream: "To confirm.",
        holiday: "Do not schedule on observed holidays; select a business-day alternative.",
      };
      return {
        Title: template.name,
        Category: categoryLabel(template.category),
        Purpose: template.purpose,
        Leader: template.owner,
        Attendees: template.attendeeGroup,
        Cadence: template.cadence,
        FrequencyDetail: frequencyDetail(template.generation, template.cadence),
        ...sharePointRuleFields(template.generation),
        PreferredTime: template.startTime ?? "TBD",
        DurationMinutes: template.durationMinutes,
        Modality: modalityLabel(template.modality),
        Location: template.location,
        AttendanceRule: template.attendanceRequirement,
        Flexibility: template.flexibility,
        RuleStatus: template.ruleStatus,
        UpstreamDependency: dependency.upstream,
        DownstreamDependency: dependency.downstream,
        HolidayHandling: dependency.holiday,
        Notes: [
          template.validationNote,
          template.assumptionIds?.length ? `Assumptions: ${template.assumptionIds.join("; ")}` : "",
          sourceText(template.sourceReferences),
        ].filter(Boolean).join(" | "),
      };
    }),
    [
      "Title",
      "Category",
      "Purpose",
      "Leader",
      "Attendees",
      "Cadence",
      "FrequencyDetail",
      "DefaultMonth",
      "DayOfWeek",
      "WeekOfMonth",
      "PreferredTime",
      "DurationMinutes",
      "Modality",
      "Location",
      "AttendanceRule",
      "Flexibility",
      "RuleStatus",
      "UpstreamDependency",
      "DownstreamDependency",
      "HolidayHandling",
      "Notes",
    ],
  ),
);

writeFileSync(
  join(OUT_DIR, "lss-meeting-types.csv"),
  csv(
    templates.map((template) => ({
      Title: template.name,
      MeetingId: template.id,
      Abbreviation: template.abbreviation,
      Category: template.category,
      Purpose: template.purpose,
      Leader: template.owner,
      Attendees: template.attendeeGroup,
      Cadence: template.cadence,
      DurationMinutes: template.durationMinutes,
      StartTime: template.startTime ?? "TBD",
      Modality: template.modality,
      Location: template.location,
      AttendanceRequirement: template.attendanceRequirement,
      Flexibility: template.flexibility,
      RuleStatus: template.ruleStatus,
      ...ruleFields(template.generation),
      Priority: template.priority,
      SourceReferences: sourceText(template.sourceReferences),
      Assumptions: template.assumptionIds?.join("; ") ?? "",
      ValidationNote: template.validationNote ?? "",
    })),
    [
      "Title",
      "MeetingId",
      "Abbreviation",
      "Category",
      "Purpose",
      "Leader",
      "Attendees",
      "Cadence",
      "DurationMinutes",
      "StartTime",
      "Modality",
      "Location",
      "AttendanceRequirement",
      "Flexibility",
      "RuleStatus",
      "GenerationType",
      "Months",
      "Ordinal",
      "DayOfWeek",
      "FixedDates",
      "Priority",
      "SourceReferences",
      "Assumptions",
      "ValidationNote",
    ],
  ),
);

writeFileSync(
  join(OUT_DIR, "lss-holidays-2027.csv"),
  csv(
    sharePointHolidays.map((holiday) => ({
      Title: holiday.name,
      Date: holiday.date,
      Status: holiday.status,
    })),
    ["Title", "Date", "Status"],
  ),
);

writeFileSync(
  join(OUT_DIR, "new-holiday-2027.csv"),
  csv(
    sharePointHolidays.map((holiday) => ({
      "New Holiday 2027": holiday.name,
      Date: holiday.date,
      Status: holiday.status,
    })),
    ["New Holiday 2027", "Date", "Status"],
  ),
);

writeFileSync(
  join(OUT_DIR, "lss-holidays-2027-paste.tsv"),
  tsv(
    sharePointHolidays.map((holiday) => ({
      Title: holiday.name,
      Date: holiday.date,
      Status: holiday.status,
    })),
    ["Title", "Date", "Status"],
    false,
  ),
);

writeFileSync(
  join(OUT_DIR, "lss-decision-items.csv"),
  csv(
    decisions.map((decision) => ({
      Title: decision.title,
      DecisionId: decision.id,
      Severity: decision.severity,
      Summary: decision.summary,
      Question: decision.question,
      Source: decision.source,
      RelatedMeetingId: decision.relatedTemplateId ?? "",
      RelatedEventId: decision.relatedEventId ?? "",
    })),
    [
      "Title",
      "DecisionId",
      "Severity",
      "Summary",
      "Question",
      "Source",
      "RelatedMeetingId",
      "RelatedEventId",
    ],
  ),
);

const decisionHeadings = [
  "Title",
  "DecisionId",
  "Severity",
  "Summary",
  "Question",
  "Source",
  "RelatedMeetingId",
  "RelatedEventId",
];

writeFileSync(
  join(OUT_DIR, "lss-decision-items-paste.tsv"),
  tsv(
    decisions.map((decision) => ({
      Title: decision.title,
      DecisionId: decision.id,
      Severity: decision.severity,
      Summary: decision.summary,
      Question: decision.question,
      Source: decision.source,
      RelatedMeetingId: decision.relatedTemplateId ?? "",
      RelatedEventId: decision.relatedEventId ?? "",
    })),
    decisionHeadings,
    false,
  ),
);

writeFileSync(
  join(OUT_DIR, "lss-assumptions.csv"),
  csv(
    assumptions.map((assumption) => ({
      Title: assumption.title,
      AssumptionId: assumption.id,
      Value: assumption.value,
      Rationale: assumption.rationale,
      Authority: assumption.authority,
    })),
    ["Title", "AssumptionId", "Value", "Rationale", "Authority"],
  ),
);

writeFileSync(
  join(OUT_DIR, "lss-assumptions-paste.tsv"),
  tsv(
    assumptions.map((assumption) => ({
      Title: assumption.title,
      AssumptionId: assumption.id,
      Value: assumption.value,
      Rationale: assumption.rationale,
      Authority: assumption.authority,
    })),
    ["Title", "AssumptionId", "Value", "Rationale", "Authority"],
    false,
  ),
);

writeFileSync(
  join(OUT_DIR, "lss-generated-events-2027.csv"),
  csv(
    plan.events.map((event) => ({
      Title: event.name,
      EventId: event.id,
      MeetingId: event.templateId,
      Date: event.isPlaceholder ? `${event.date.slice(0, 7)} date TBD` : event.date,
      OriginalDate: event.originalDate,
      Time: event.startTime ?? "TBD",
      Abbreviation: event.abbreviation,
      Category: event.category,
      Status: event.status,
      RuleStatus: event.ruleStatus,
      Leader: event.owner,
      Attendees: event.attendeeGroup,
      DurationMinutes: event.durationMinutes,
      Modality: event.modality,
      Location: event.location,
      Conflicts: event.conflicts.map((conflict) => conflict.summary).join(" | "),
      Alternatives: event.alternatives.map((alternative) => `${alternative.date}: ${alternative.reason}`).join(" | "),
      Assumptions: event.assumptionIds.join("; "),
      Explanation: event.explanation,
    })),
    [
      "Title",
      "EventId",
      "MeetingId",
      "Date",
      "OriginalDate",
      "Time",
      "Abbreviation",
      "Category",
      "Status",
      "RuleStatus",
      "Leader",
      "Attendees",
      "DurationMinutes",
      "Modality",
      "Location",
      "Conflicts",
      "Alternatives",
      "Assumptions",
      "Explanation",
    ],
  ),
);

console.log(`Wrote SharePoint import files to ${OUT_DIR}/`);
