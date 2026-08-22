import {
  buildAssumptions,
  buildBaseDecisionItems,
  buildMeetingTemplates,
  holidays2027,
} from "@/data/source-data";
import type {
  Alternative,
  CalendarPlan,
  Conflict,
  EventStatus,
  GenerationRule,
  LocalDecision,
  MeetingTemplate,
  ProposedEvent,
  ScenarioSettings,
} from "@/lib/types";

const YEAR = 2027;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function utcDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function addDays(date: string, amount: number): string {
  const next = utcDate(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return isoDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function dayOfWeek(date: string): number {
  return utcDate(date).getUTCDay();
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  ordinal: number,
): string {
  if (ordinal === -1) {
    const last = daysInMonth(year, month);
    const lastDate = isoDate(year, month, last);
    const offset = (dayOfWeek(lastDate) - weekday + 7) % 7;
    return isoDate(year, month, last - offset);
  }

  const first = isoDate(year, month, 1);
  const offset = (weekday - dayOfWeek(first) + 7) % 7;
  return isoDate(year, month, 1 + offset + (ordinal - 1) * 7);
}

function datesForRule(rule: GenerationRule): string[] {
  switch (rule.type) {
    case "weekly": {
      const dates: string[] = [];
      let cursor = isoDate(YEAR, 1, 1);
      while (dayOfWeek(cursor) !== rule.weekday) cursor = addDays(cursor, 1);
      while (utcDate(cursor).getUTCFullYear() === YEAR) {
        dates.push(cursor);
        cursor = addDays(cursor, 7);
      }
      return dates;
    }
    case "nth_weekday":
      return rule.months.map((month) =>
        nthWeekday(YEAR, month, rule.weekday, rule.ordinal),
      );
    case "two_day_nth_weekday":
      return rule.months.flatMap((month) => {
        const first = nthWeekday(YEAR, month, rule.weekday, rule.ordinal);
        return [first, addDays(first, 1)];
      });
    case "fixed_dates":
      return rule.dates;
    case "month_placeholder":
      return rule.months.map((month) => isoDate(YEAR, month, 1));
  }
}

function isYearEndBlackout(date: string): boolean {
  return date >= "2027-12-24" && date <= "2027-12-31";
}

function holidayFor(date: string) {
  return holidays2027.find((holiday) => holiday.date === date);
}

function isWeekend(date: string): boolean {
  const weekday = dayOfWeek(date);
  return weekday === 0 || weekday === 6;
}

function isValidBusinessDay(date: string): boolean {
  return !holidayFor(date) && !isYearEndBlackout(date) && !isWeekend(date);
}

function nearestValidDate(date: string, direction: 1 | -1 = 1): string | null {
  for (let distance = 1; distance <= 10; distance += 1) {
    const candidate = addDays(date, distance * direction);
    if (isValidBusinessDay(candidate)) return candidate;
  }
  return null;
}

function baseStatus(template: MeetingTemplate): EventStatus {
  if (template.ruleStatus === "open_question") return "blocked";
  if (template.ruleStatus === "needs_validation") return "needs_decision";
  return "ready";
}

function conflictStatus(
  current: EventStatus,
  conflicts: Conflict[],
): EventStatus {
  if (conflicts.some((conflict) => conflict.severity === "blocked")) return "blocked";
  if (
    current === "blocked" ||
    conflicts.some((conflict) => conflict.severity === "decision")
  ) {
    return current === "blocked" ? "blocked" : "needs_decision";
  }
  return current;
}

function initialConflicts(
  template: MeetingTemplate,
  date: string,
  isPlaceholder: boolean,
): { conflicts: Conflict[]; alternatives: Alternative[] } {
  const conflicts: Conflict[] = [];
  const alternatives: Alternative[] = [];

  if (isPlaceholder) {
    conflicts.push({
      id: `${template.id}-${date}-missing-rule`,
      type: "missing_rule",
      severity: "blocked",
      summary: "A final date cannot be generated.",
      detail:
        template.id === "bvr"
          ? "The program-to-slot map, ownership, and complete monthly pattern are missing."
          : "The responsible owner must supply the date-selection rule and event count.",
    });
    return { conflicts, alternatives };
  }

  const holiday = holidayFor(date);
  if (holiday) {
    const alternative = nearestValidDate(date, 1);
    conflicts.push({
      id: `${template.id}-${date}-holiday`,
      type: "holiday",
      severity: "decision",
      summary: `${holiday.name} falls on the proposed date.`,
      detail:
        holiday.status === "projected_lss"
          ? "This LSS closure is projected from 2026 and still requires confirmation."
          : "The recurrence rule does not override an observed federal holiday.",
    });
    if (alternative) {
      alternatives.push({
        date: alternative,
        reason: "Nearest valid business day after the holiday.",
      });
    }
  }

  if (isYearEndBlackout(date)) {
    const alternative = nearestValidDate(date, -1);
    conflicts.push({
      id: `${template.id}-${date}-blackout`,
      type: "blackout",
      severity: "decision",
      summary: "The proposed date falls inside the projected year-end blackout.",
      detail:
        "Routine governance and organizational meetings should not occur between Christmas and New Year without an explicit exception.",
    });
    if (alternative) {
      alternatives.push({
        date: alternative,
        reason: "Nearest valid business day before the year-end blackout.",
      });
    }
  }

  if (template.validationNote) {
    conflicts.push({
      id: `${template.id}-${date}-validation`,
      type:
        template.id === "finance-committee" ? "dependency" : "source_rule",
      severity:
        template.id === "finance-committee" ? "blocked" : "decision",
      summary: template.validationNote,
      detail: "The POC preserves this issue for leadership review rather than inventing a permanent rule.",
    });
  } else if (template.ruleStatus === "open_question") {
    conflicts.push({
      id: `${template.id}-${date}-open-question`,
      type: "missing_rule",
      severity: "blocked",
      summary: "Required rule fields are incomplete.",
      detail:
        "This date is visible as a planning position only. Its owner, purpose, attendance, dependency, or recurrence must be resolved before use.",
    });
  } else if (template.ruleStatus === "needs_validation") {
    conflicts.push({
      id: `${template.id}-${date}-unapproved-baseline`,
      type: "source_rule",
      severity: "decision",
      summary: "This 2027 recurrence is not yet approved.",
      detail:
        "The POC generated the date from historical evidence or recent direction and preserves it as a scenario choice.",
    });
  }

  return { conflicts, alternatives };
}

function explanationFor(
  template: MeetingTemplate,
  date: string,
  conflicts: Conflict[],
): string {
  if (conflicts.length === 0) {
    return `The proposed date follows the ${template.cadence.toLowerCase()} baseline with no detected conflict in the uploaded POC data.`;
  }
  const primary = conflicts[0];
  return `${primary.summary} ${primary.detail}`;
}

function makeEvent(template: MeetingTemplate, date: string, index: number): ProposedEvent {
  const isPlaceholder = template.generation.type === "month_placeholder";
  const { conflicts, alternatives } = initialConflicts(template, date, isPlaceholder);
  const status = conflictStatus(baseStatus(template), conflicts);

  return {
    id: `${template.id}-${date}-${index + 1}`,
    templateId: template.id,
    abbreviation: template.abbreviation,
    name: template.name,
    category: template.category,
    date,
    originalDate: date,
    startTime: template.startTime,
    durationMinutes: template.durationMinutes,
    purpose: template.purpose,
    owner: template.owner,
    attendeeGroup: template.attendeeGroup,
    modality: template.modality,
    location: template.location,
    attendanceRequirement: template.attendanceRequirement,
    flexibility: template.flexibility,
    ruleStatus: template.ruleStatus,
    status,
    conflicts,
    alternatives,
    explanation: explanationFor(template, date, conflicts),
    sourceReferences: template.sourceReferences,
    assumptionIds: template.assumptionIds ?? [],
    isPlaceholder,
  };
}

function minutes(time: string | null): number | null {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function rangesOverlap(a: ProposedEvent, b: ProposedEvent): boolean {
  const aStart = minutes(a.startTime);
  const bStart = minutes(b.startTime);
  if (aStart === null || bStart === null) return false;
  return aStart < bStart + b.durationMinutes && bStart < aStart + a.durationMinutes;
}

function attendeeGroupsOverlap(a: ProposedEvent, b: ProposedEvent): boolean {
  const left = a.attendeeGroup.toLowerCase();
  const right = b.attendeeGroup.toLowerCase();
  const leadershipPair = [a.templateId, b.templateId].every((id) =>
    ["leadership-team", "leadership-retreat"].includes(id),
  );
  const executivePair = [a.templateId, b.templateId].every((id) =>
    ["executive-team", "executive-retreat"].includes(id),
  );
  return (
    leadershipPair ||
    executivePair ||
    left.includes("executive team") && right.includes("executive team")
  ) || (
    left.includes("leadership team") && right.includes("leadership team")
  ) || (
    left.includes("full board") && right.includes("full board")
  );
}

type CollisionEvent = ProposedEvent & { priorityForCollision: number };

function applyInternalCollisions(events: CollisionEvent[]): void {
  const byDate = new Map<string, CollisionEvent[]>();
  for (const event of events) {
    const group = byDate.get(event.date) ?? [];
    group.push(event);
    byDate.set(event.date, group);
  }

  for (const group of byDate.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i];
        const b = group[j];
        if (!rangesOverlap(a, b) || !attendeeGroupsOverlap(a, b)) continue;

        const movable = a.priorityForCollision > b.priorityForCollision ? b : a;
        const protectedEvent = movable === a ? b : a;
        const alternativeDate = addDays(movable.date, 7);
        movable.conflicts.push({
          id: `${movable.id}-attendance-overlap`,
          type: "attendance",
          severity: "decision",
          summary: `${movable.name} overlaps ${protectedEvent.name}.`,
          detail:
            "The groups share required leadership participants. The more protected event remains anchored.",
        });
        movable.alternatives.push({
          date: alternativeDate,
          reason: "Move the less-protected meeting one week while preserving its weekday.",
        });
        movable.status = "needs_decision";
        movable.explanation = `${movable.name} overlaps ${protectedEvent.name}. The more protected event remains anchored, so the draft proposes moving this occurrence while preserving its weekday.`;
      }
    }
  }
}

function applyDecisions(
  events: ProposedEvent[],
  decisions: LocalDecision[],
): ProposedEvent[] {
  return events.map((event) => {
    const decision = decisions.find((item) => item.eventId === event.id);
    if (!decision) return event;

    if (decision.action === "use_alternative" && decision.selectedDate) {
      return {
        ...event,
        date: decision.selectedDate,
        startTime: decision.selectedStartTime ?? event.startTime,
        status: "reviewed",
      };
    }
    if (decision.action === "approve_exception") {
      return { ...event, status: "exception_approved" };
    }
    return { ...event, status: "reviewed" };
  });
}

export function generateCalendarPlan(
  settings: ScenarioSettings,
  localDecisions: LocalDecision[] = [],
): CalendarPlan {
  const templates = buildMeetingTemplates(settings);
  const collisionEvents: CollisionEvent[] = templates.flatMap((template) =>
    datesForRule(template.generation).map((date, index) => ({
      ...makeEvent(template, date, index),
      priorityForCollision: template.priority,
    })),
  );

  applyInternalCollisions(collisionEvents);
  const events = applyDecisions(collisionEvents, localDecisions)
    .map(({ priorityForCollision, ...event }) => {
      void priorityForCollision;
      return event;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const eventDecisions = events
    .filter(
      (event) =>
        event.status !== "reviewed" &&
        event.status !== "exception_approved" &&
        event.conflicts.some(
          (conflict) =>
            conflict.type === "holiday" || conflict.type === "blackout",
        ),
    )
    .map((event) => {
      const calendarConflict = event.conflicts.find(
        (conflict) =>
          conflict.type === "holiday" || conflict.type === "blackout",
      );
      return {
        id: `D-${event.id}`,
        title: `${event.abbreviation}: calendar exception`,
        severity: "decision" as const,
        summary: calendarConflict?.summary ?? "Calendar exception requires review.",
        question: event.alternatives[0]
          ? `Use ${event.alternatives[0].date}, select another date, or approve an exception?`
          : "Select another date or approve an exception?",
        source: "MVP 1 Rulebook B.2 — Holidays and Blackout Periods",
        relatedTemplateId: event.templateId,
        relatedEventId: event.id,
      };
    });

  return {
    year: YEAR,
    label: "2027 Working Draft — POC scenario",
    generatedAt: new Date().toISOString(),
    settings,
    assumptions: buildAssumptions(settings),
    holidays: holidays2027,
    events,
    decisions: [...buildBaseDecisionItems(settings), ...eventDecisions],
  };
}

export function applyLocalDecision(
  decisions: LocalDecision[],
  next: LocalDecision,
): LocalDecision[] {
  return [...decisions.filter((item) => item.eventId !== next.eventId), next];
}

export function exportPlanCsv(plan: CalendarPlan): string {
  const headings = [
    "Date",
    "Time",
    "Abbreviation",
    "Meeting",
    "Category",
    "Status",
    "Rule Status",
    "Owner",
    "Attendee Group",
    "Duration Minutes",
    "Modality",
    "Location",
    "Conflicts",
    "Assumptions",
  ];

  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  const rows = plan.events.map((event) =>
    [
      event.date,
      event.startTime ?? "TBD",
      event.abbreviation,
      event.name,
      event.category,
      event.status,
      event.ruleStatus,
      event.owner,
      event.attendeeGroup,
      event.durationMinutes,
      event.modality,
      event.location,
      event.conflicts.map((conflict) => conflict.summary).join(" | "),
      event.assumptionIds.join(" | "),
    ]
      .map(escape)
      .join(","),
  );

  return [headings.join(","), ...rows].join("\n");
}
