import { buildMeetingTemplates } from "@/data/source-data";
import { generateCalendarPlan, generateEventsForTemplate } from "@/lib/scheduling";
import type {
  CalendarPlan,
  GenerationRule,
  MeetingTemplate,
  ProposedEvent,
  ScenarioSettings,
} from "@/lib/types";

export type PlanPhase = "board" | "committee" | "executive" | "organization" | "review";

export interface PlanStep {
  id: string;
  label: string;
  meetingLabel: string;
  question: string;
  templateIds: string[];
}

export interface PlanYearState {
  plan: CalendarPlan;
  activePhase: PlanPhase;
  activeStepIndex: number;
  activeStepId: string;
  phaseSteps: PlanStep[];
  confirmedPhases: PlanPhase[];
  eventOverrides: Record<string, PlanEventOverride>;
  workingRules: Record<string, WorkingMeetingRule>;
  hiddenEventIds: string[];
  customTemplates: MeetingTemplate[];
  calendarClosures: CalendarClosure[];
  approvedTemplateIds: string[];
}

export interface CalendarClosure {
  id: string;
  date: string;
  label: string;
}

export interface PlanEventOverride {
  date?: string;
  startTime?: string | null;
  durationMinutes?: number;
  title?: string;
  message?: string;
  location?: string;
  modality?: string;
  attendees?: string[];
  distributionLists?: string[];
  owner?: string;
  attendeeGroup?: string;
}

export interface WorkingMeetingRule {
  cadence?: string;
  cadencePreset?: CadencePreset;
  annualCount?: number;
  startMonth?: number;
  ordinal?: number;
  weekday?: number;
  owner?: string;
  startTime?: string | null;
  durationMinutes?: number;
  location?: string;
  modality?: string;
  attendeeGroup?: string;
  attendees?: string[];
  distributionLists?: string[];
  titleTemplate?: string;
  messageTemplate?: string;
  minimumLeadDays?: number;
  note?: string;
}

export type CadencePreset =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "every_other_month"
  | "quarterly"
  | "semiannual"
  | "custom";

export interface ResolvedPlanEvent extends ProposedEvent {
  title: string;
  message: string;
  attendees: string[];
  distributionLists: string[];
  locked: boolean;
}

export interface ProposedPlanChange {
  eventId: string;
  patch: PlanEventOverride;
}

export interface PlanChangeProposal {
  valid: boolean;
  summary: string;
  reason?: string;
  changes: ProposedPlanChange[];
  settingsPatch?: Partial<ScenarioSettings>;
}

export const PHASE_LABELS: Record<PlanPhase, string> = {
  board: "Board",
  committee: "Board Committees",
  executive: "Executive Leadership",
  organization: "Organization & Operations",
  review: "Final Review",
};

export const PHASE_ORDER: PlanPhase[] = [
  "board",
  "committee",
  "executive",
  "organization",
  "review",
];

export const PLAN_STEPS: Record<PlanPhase, PlanStep[]> = {
  board: [
    {
      id: "board-calendar",
      label: "Board calendar",
      meetingLabel: "Full Board, retreats, and critical-issue check-ins",
      question:
        "I placed the 2026 Board rhythm as a working baseline. Should 2027 keep that rhythm or use four regular meetings and two longer retreats?",
      templateIds: ["full-board", "board-retreat", "critical-checkin"],
    },
  ],
  committee: [
    {
      id: "executive-committee",
      label: "Executive Committee",
      meetingLabel: "Executive Committee",
      question:
        "Should Executive Committee remain in alternating months without a regular Full Board meeting?",
      templateIds: ["executive-committee"],
    },
    {
      id: "finance-committee",
      label: "Administration & Finance",
      meetingLabel: "Administration & Finance Committee",
      question:
        "What 2027 budget deadline and financial-data-ready date should control the Finance-to-Board sequence?",
      templateIds: ["finance-committee"],
    },
    {
      id: "health-programs",
      label: "Health Center & Programs",
      meetingLabel: "Health Center & Programs Committee",
      question: "Should the quarterly 2026 pattern remain the provisional 2027 baseline?",
      templateIds: ["health-programs"],
    },
    {
      id: "talent-risk",
      label: "Talent & Risk",
      meetingLabel: "Talent & Risk Management Committee",
      question: "Should the quarterly 2026 pattern remain the provisional 2027 baseline?",
      templateIds: ["talent-risk"],
    },
    {
      id: "nominations-committee",
      label: "Nominations",
      meetingLabel: "Nominations Committee",
      question: "Should Nominations receive a recurring cadence or be scheduled only when needed?",
      templateIds: ["nominations-committee"],
    },
    {
      id: "program-committee",
      label: "Program",
      meetingLabel: "Program Committee",
      question: "What purpose, participants, and cadence should define the Program Committee?",
      templateIds: ["program-committee"],
    },
  ],
  executive: [
    {
      id: "executive-team",
      label: "Executive Team",
      meetingLabel: "Executive Team meetings and retreats",
      question:
        "I placed weekly Monday Executive Team meetings and quarterly retreats. What replacement-day rule should apply on Monday holidays?",
      templateIds: ["executive-team", "executive-retreat"],
    },
    {
      id: "leadership-team",
      label: "Leadership Team",
      meetingLabel: "Leadership Team meetings and retreats",
      question:
        "Should the 2026 Leadership Team cadence and quarterly retreat pattern continue in 2027?",
      templateIds: ["leadership-team", "leadership-retreat"],
    },
    {
      id: "supervisory-team",
      label: "Supervisory Team",
      meetingLabel: "Supervisory Team",
      question:
        "Which Supervisory Team frequency is authoritative for 2027?",
      templateIds: ["supervisory-team"],
    },
  ],
  organization: [
    {
      id: "all-staff",
      label: "All Staff",
      meetingLabel: "All Staff",
      question:
        "The source calendars disagree on All Staff months and duration. Which pattern should define 2027?",
      templateIds: ["all-staff"],
    },
    {
      id: "program-briefings",
      label: "Program Briefings",
      meetingLabel: "Quarterly Program Briefings",
      question:
        "Who owns Quarterly Program Briefings, and what rule should select their dates?",
      templateIds: ["program-briefing"],
    },
    {
      id: "operations",
      label: "Operations",
      meetingLabel: "Operations meetings",
      question:
        "Should Operations remain one recurring meeting or split into several operating groups?",
      templateIds: ["operations"],
    },
    {
      id: "bvr-risk",
      label: "BVR & Internal Risk",
      meetingLabel: "BVR and Internal Risk",
      question:
        "What owner, participants, and date rules should define BVR and Internal Risk in 2027?",
      templateIds: ["bvr", "internal-risk"],
    },
  ],
  review: [
    {
      id: "final-review",
      label: "Final review",
      meetingLabel: "Complete 2027 working calendar",
      question:
        "The complete working calendar is visible. Which remaining conflicts or open rules must be resolved before export?",
      templateIds: [],
    },
  ],
};

function stateAt(
  state: Omit<PlanYearState, "activeStepId" | "phaseSteps">,
): PlanYearState {
  const phaseSteps = PLAN_STEPS[state.activePhase];
  const activeStepIndex = Math.min(
    state.activeStepIndex,
    Math.max(phaseSteps.length - 1, 0),
  );
  return {
    ...state,
    activeStepIndex,
    activeStepId: phaseSteps[activeStepIndex]?.id ?? "final-review",
    phaseSteps,
  };
}

export function createPlanYearState(plan: CalendarPlan): PlanYearState {
  return stateAt({
    plan,
    activePhase: "board",
    activeStepIndex: 0,
    confirmedPhases: [],
    eventOverrides: {},
    workingRules: {},
    hiddenEventIds: [],
    customTemplates: [],
    calendarClosures: [],
    approvedTemplateIds: [],
  });
}

export function meetingTemplatesForState(state: PlanYearState): MeetingTemplate[] {
  return [...(state.plan.templates ?? buildMeetingTemplates(state.plan.settings)), ...(state.customTemplates ?? [])];
}

export function addLayerMeetingGroup(
  state: PlanYearState,
  input: { name: string; attendees: string[]; phase: "committee" | "executive" | "organization" },
): { state: PlanYearState; templateId: string } {
  const name = input.name.trim();
  if (!name) throw new Error("Meeting group name is required.");
  const baseId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "committee-group";
  const usedIds = new Set(meetingTemplatesForState(state).map((template) => template.id));
  let templateId = baseId;
  let suffix = 2;
  while (usedIds.has(templateId)) {
    templateId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const template: MeetingTemplate = {
    id: templateId,
    abbreviation: name
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 7)
      .toUpperCase(),
    name,
    category: input.phase,
    purpose: "Purpose needs confirmation.",
    owner: "To confirm",
    attendeeGroup: name,
    cadence: "No recurring cadence selected",
    durationMinutes: 60,
    startTime: null,
    modality: "To confirm",
    location: "To confirm",
    attendanceRequirement: "To confirm",
    flexibility: "conditional",
    ruleStatus: "open_question",
    generation: { type: "nth_weekday", months: [], ordinal: 2, weekday: 2 },
    priority: 72,
    sourceReferences: [
      {
        label: "2027 Plan Year session",
        detail: "Created locally by the planning user; cadence and authority remain unconfirmed.",
      },
    ],
    validationNote: "Confirm purpose, authority, and cadence before treating this as an organizational rule.",
  };
  return {
    templateId,
    state: {
      ...state,
      customTemplates: [...(state.customTemplates ?? []), template],
      workingRules: {
        ...state.workingRules,
        [templateId]: { attendees: input.attendees.length ? input.attendees : [name] },
      },
    },
  };
}

export function addCommitteeMeetingGroup(
  state: PlanYearState,
  input: { name: string; attendees: string[] },
): { state: PlanYearState; templateId: string } {
  return addLayerMeetingGroup(state, { ...input, phase: "committee" });
}

export function addCalendarClosure(
  state: PlanYearState,
  date: string,
  label = "LSS closure",
): PlanYearState {
  if (!/^2027-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a date in calendar year 2027.");
  const holiday = state.plan.holidays.find((item) => item.date === date && item.status === "verified_federal");
  if (holiday) throw new Error(`${holiday.name} is already blocked as a federal holiday.`);
  const meetings = state.plan.events.filter(
    (event) => !event.isPlaceholder && !state.hiddenEventIds.includes(event.id) && resolvePlanEvent(state, event.id).date === date,
  );
  if (meetings.length) {
    throw new Error(`Move ${meetings.length} meeting${meetings.length === 1 ? "" : "s"} off this date before closing it.`);
  }
  if ((state.calendarClosures ?? []).some((closure) => closure.date === date)) return state;
  return {
    ...state,
    calendarClosures: [...(state.calendarClosures ?? []), {
      id: `closure-${date}`,
      date,
      label: label.trim() || "LSS closure",
    }].sort((left, right) => left.date.localeCompare(right.date)),
  };
}

export function removeCalendarClosure(state: PlanYearState, date: string): PlanYearState {
  return { ...state, calendarClosures: (state.calendarClosures ?? []).filter((closure) => closure.date !== date) };
}

export function addAdHocEvent(
  state: PlanYearState,
  date: string,
  title: string,
): { state: PlanYearState; eventId: string; templateId: string } {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("Event name is required.");
  const blocked = state.plan.holidays.find((holiday) => holiday.date === date && holiday.status === "verified_federal")
    ?? (state.calendarClosures ?? []).find((closure) => closure.date === date);
  if (blocked) throw new Error(`${"name" in blocked ? blocked.name : blocked.label} is closed to meetings.`);
  const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "event";
  const templateId = `ad-hoc-${date}-${slug}-${(state.customTemplates ?? []).filter((template) => template.id.startsWith(`ad-hoc-${date}-`)).length + 1}`;
  const template: MeetingTemplate = {
    id: templateId,
    abbreviation: cleanTitle.split(/\s+/).map((word) => word[0]).join("").slice(0, 7).toUpperCase(),
    name: cleanTitle,
    category: "organization",
    purpose: "Ad hoc calendar event added during 2027 planning.",
    owner: "To confirm",
    attendeeGroup: "To confirm",
    cadence: "One-time 2027 event",
    durationMinutes: 60,
    startTime: null,
    modality: "To confirm",
    location: "To confirm",
    attendanceRequirement: "To confirm",
    flexibility: "conditional",
    ruleStatus: "confirmed",
    generation: { type: "fixed_dates", dates: [date] },
    priority: 84,
    sourceReferences: [{ label: "2027 Plan Year session", detail: "Added directly by the planning user as a one-time 2027 event." }],
  };
  const event = generateEventsForTemplate(template)[0];
  return {
    templateId,
    eventId: event.id,
    state: {
      ...state,
      customTemplates: [...(state.customTemplates ?? []), template],
      plan: { ...state.plan, events: [...state.plan.events, event].sort((left, right) => left.date.localeCompare(right.date)) },
      workingRules: { ...state.workingRules, [templateId]: { annualCount: 1, cadencePreset: "custom", cadence: "One-time 2027 event" } },
    },
  };
}

export function removePlanEvent(
  state: PlanYearState,
  eventId: string,
): PlanYearState {
  eventById(state, eventId);
  return {
    ...state,
    hiddenEventIds: [...new Set([...state.hiddenEventIds, eventId])],
  };
}

export function advancePlanStep(state: PlanYearState): PlanYearState {
  if (state.activeStepIndex >= state.phaseSteps.length - 1) return state;
  return stateAt({
    plan: state.plan,
    activePhase: state.activePhase,
    activeStepIndex: state.activeStepIndex + 1,
    confirmedPhases: state.confirmedPhases,
    eventOverrides: state.eventOverrides,
    workingRules: state.workingRules,
    hiddenEventIds: state.hiddenEventIds,
    customTemplates: state.customTemplates,
    calendarClosures: state.calendarClosures,
    approvedTemplateIds: state.approvedTemplateIds,
  });
}

export function previousPlanStep(state: PlanYearState): PlanYearState {
  if (state.activeStepIndex === 0) return state;
  return stateAt({
    plan: state.plan,
    activePhase: state.activePhase,
    activeStepIndex: state.activeStepIndex - 1,
    confirmedPhases: state.confirmedPhases,
    eventOverrides: state.eventOverrides,
    workingRules: state.workingRules,
    hiddenEventIds: state.hiddenEventIds,
    customTemplates: state.customTemplates,
    calendarClosures: state.calendarClosures,
    approvedTemplateIds: state.approvedTemplateIds,
  });
}

export function confirmActivePhase(state: PlanYearState): PlanYearState {
  const phaseIndex = PHASE_ORDER.indexOf(state.activePhase);
  const nextPhase = PHASE_ORDER[Math.min(phaseIndex + 1, PHASE_ORDER.length - 1)];
  const confirmedPhases = state.confirmedPhases.includes(state.activePhase)
    ? state.confirmedPhases
    : [...state.confirmedPhases, state.activePhase];
  return stateAt({
    plan: state.plan,
    activePhase: nextPhase,
    activeStepIndex: 0,
    confirmedPhases,
    eventOverrides: state.eventOverrides,
    workingRules: state.workingRules,
    hiddenEventIds: state.hiddenEventIds,
    customTemplates: state.customTemplates,
    calendarClosures: state.calendarClosures,
    approvedTemplateIds: state.approvedTemplateIds,
  });
}

function templateIdsForPhase(phase: PlanPhase, state?: PlanYearState): Set<string> {
  const ids = PLAN_STEPS[phase].flatMap((step) => step.templateIds);
  if (["committee", "executive", "organization"].includes(phase) && state) {
    ids.push(...(state.customTemplates ?? []).filter((template) => template.category === phase).map((template) => template.id));
  }
  return new Set(ids);
}

export function isEventConfirmed(state: PlanYearState, event: ProposedEvent): boolean {
  if (event.templateId.startsWith("ad-hoc-")) return true;
  return state.confirmedPhases.some((phase) =>
    templateIdsForPhase(phase, state).has(event.templateId),
  );
}

export function visiblePlanEvents(state: PlanYearState): ProposedEvent[] {
  if (state.activePhase === "review") return state.plan.events;
  const activeTemplateIds = templateIdsForPhase(state.activePhase, state);
  return state.plan.events.filter(
    (event) =>
      !state.hiddenEventIds.includes(event.id) &&
      (event.templateId.startsWith("ad-hoc-") || isEventConfirmed(state, event) || activeTemplateIds.has(event.templateId)),
  );
}

export function isEventLocked(
  state: PlanYearState,
  event: ProposedEvent,
): boolean {
  if (event.templateId.startsWith("ad-hoc-")) return false;
  const eventPhase = phaseForTemplate(event.templateId, state);
  return isEventConfirmed(state, event) && eventPhase !== state.activePhase;
}

function eventById(state: PlanYearState, eventId: string): ProposedEvent {
  const event = state.plan.events.find((item) => item.id === eventId);
  if (!event) throw new Error(`Meeting ${eventId} was not found.`);
  return event;
}

function phaseForTemplate(templateId: string, state?: PlanYearState): PlanPhase | null {
  const customTemplate = state?.customTemplates?.find((template) => template.id === templateId);
  if (customTemplate && ["committee", "executive", "organization"].includes(customTemplate.category)) {
    return customTemplate.category as PlanPhase;
  }
  for (const phase of PHASE_ORDER) {
    if (PLAN_STEPS[phase].some((step) => step.templateIds.includes(templateId))) {
      return phase;
    }
  }
  return null;
}

export function resolvePlanEvent(
  state: PlanYearState,
  eventId: string,
): ResolvedPlanEvent {
  const event = eventById(state, eventId);
  const workingRule = state.workingRules[event.templateId] ?? {};
  const rulePatch = eventPatchForRule(workingRule);
  const override = state.eventOverrides[eventId] ?? {};
  const automaticallyMoved = event.conflicts.some(
    (conflict) => conflict.type === "automatic_move",
  );
  const ruleDate = workingRule.weekday === undefined || automaticallyMoved
    ? event.date
    : dateOnPreferredWeekday(event.date, workingRule.weekday);
  return {
    ...event,
    ...rulePatch,
    ...override,
    date: override.date ?? ruleDate,
    title: override.title ?? rulePatch.title ?? event.name,
    message: override.message ?? rulePatch.message ?? event.purpose,
    attendees: override.attendees ?? rulePatch.attendees ?? [event.attendeeGroup],
    distributionLists: override.distributionLists ?? rulePatch.distributionLists ?? [],
    locked: isEventLocked(state, event),
  };
}

function dateOnPreferredWeekday(date: string, weekday: number): string {
  const target = new Date(`${date}T12:00:00Z`);
  let offset = weekday - target.getUTCDay();
  if (offset > 3) offset -= 7;
  if (offset < -3) offset += 7;
  target.setUTCDate(target.getUTCDate() + offset);
  return target.toISOString().slice(0, 10);
}

export function updateEvent(
  state: PlanYearState,
  eventId: string,
  patch: PlanEventOverride,
): PlanYearState {
  const event = eventById(state, eventId);
  if (isEventLocked(state, event)) {
    const phase = phaseForTemplate(event.templateId, state);
    throw new Error(
      `Reopen ${phase ? PHASE_LABELS[phase] : "the confirmed layer"} before editing this meeting.`,
    );
  }
  return {
    ...state,
    eventOverrides: {
      ...state.eventOverrides,
      [eventId]: { ...state.eventOverrides[eventId], ...patch },
    },
  };
}

function activePhaseTemplateIds(state: PlanYearState): Set<string> {
  return templateIdsForPhase(state.activePhase, state);
}

export function clearActivePhase(state: PlanYearState): PlanYearState {
  const templateIds = activePhaseTemplateIds(state);
  const hidden = state.plan.events
    .filter((event) => templateIds.has(event.templateId) && !isEventLocked(state, event))
    .map((event) => event.id);
  return {
    ...state,
    hiddenEventIds: [...new Set([...state.hiddenEventIds, ...hidden])],
  };
}

function eventPatchForRule(rule: WorkingMeetingRule): PlanEventOverride {
  return {
    ...(rule.startTime !== undefined ? { startTime: rule.startTime } : {}),
    ...(rule.durationMinutes !== undefined
      ? { durationMinutes: rule.durationMinutes }
      : {}),
    ...(rule.location !== undefined ? { location: rule.location } : {}),
    ...(rule.modality !== undefined ? { modality: rule.modality } : {}),
    ...(rule.attendees !== undefined ? { attendees: rule.attendees } : {}),
    ...(rule.distributionLists !== undefined
      ? { distributionLists: rule.distributionLists }
      : {}),
    ...(rule.titleTemplate !== undefined ? { title: rule.titleTemplate } : {}),
    ...(rule.messageTemplate !== undefined ? { message: rule.messageTemplate } : {}),
    ...(rule.owner !== undefined ? { owner: rule.owner } : {}),
    ...(rule.attendeeGroup !== undefined
      ? { attendeeGroup: rule.attendeeGroup }
      : {}),
  };
}

export function regenerateActivePhase(state: PlanYearState): PlanYearState {
  const templateIds = activePhaseTemplateIds(state);
  const activeEventIds = new Set(
    state.plan.events
      .filter((event) => templateIds.has(event.templateId))
      .map((event) => event.id),
  );
  const eventOverrides = Object.fromEntries(
    Object.entries(state.eventOverrides).filter(([eventId]) => !activeEventIds.has(eventId)),
  );
  let regenerated: PlanYearState = {
    ...state,
    eventOverrides,
    hiddenEventIds: state.hiddenEventIds.filter((eventId) => !activeEventIds.has(eventId)),
  };
  for (const [templateId, rule] of Object.entries(state.workingRules)) {
    if (templateIds.has(templateId)) {
      regenerated = updateWorkingRule(regenerated, templateId, rule);
    }
  }
  return regenerated;
}

export function reopenPhase(
  state: PlanYearState,
  phase: PlanPhase,
): PlanYearState {
  const targetIndex = PHASE_ORDER.indexOf(phase);
  return stateAt({
    plan: state.plan,
    activePhase: phase,
    activeStepIndex: PLAN_STEPS[phase].length - 1,
    confirmedPhases: state.confirmedPhases.filter(
      (confirmed) => PHASE_ORDER.indexOf(confirmed) < targetIndex,
    ),
    eventOverrides: state.eventOverrides,
    workingRules: state.workingRules,
    hiddenEventIds: state.hiddenEventIds,
    customTemplates: state.customTemplates,
    calendarClosures: state.calendarClosures,
    approvedTemplateIds: state.approvedTemplateIds,
  });
}

export function navigateToPhase(
  state: PlanYearState,
  phase: PlanPhase,
): PlanYearState {
  return stateAt({
    plan: state.plan,
    activePhase: phase,
    activeStepIndex: 0,
    confirmedPhases: state.confirmedPhases,
    eventOverrides: state.eventOverrides,
    workingRules: state.workingRules,
    hiddenEventIds: state.hiddenEventIds,
    customTemplates: state.customTemplates,
    calendarClosures: state.calendarClosures,
    approvedTemplateIds: state.approvedTemplateIds,
  });
}

export function updateWorkingRule(
  state: PlanYearState,
  templateId: string,
  patch: WorkingMeetingRule,
): PlanYearState {
  const nextRule = { ...state.workingRules[templateId], ...patch };
  return {
    ...state,
    workingRules: { ...state.workingRules, [templateId]: nextRule },
  };
}

export function approveTemplateForPlan(state: PlanYearState, templateId: string): PlanYearState {
  if ((state.approvedTemplateIds ?? []).includes(templateId)) return state;
  return { ...state, approvedTemplateIds: [...(state.approvedTemplateIds ?? []), templateId] };
}

const CADENCE_COUNTS: Record<Exclude<CadencePreset, "custom">, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  every_other_month: 6,
  quarterly: 4,
  semiannual: 2,
};

const CADENCE_LABELS: Record<CadencePreset, string> = {
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
  every_other_month: "Every other month",
  quarterly: "Quarterly",
  semiannual: "Every six months",
  custom: "Custom annual count",
};

function monthsForCount(count: number, startMonth: number): number[] {
  if (count <= 0) return [];
  return Array.from({ length: Math.min(count, 12) }, (_, index) => {
    const offset = Math.floor((index * 12) / count);
    return ((startMonth - 1 + offset) % 12) + 1;
  }).sort((left, right) => left - right);
}

function nextDateOutsideClosures(state: PlanYearState, date: string): string | null {
  const cursor = new Date(`${date}T12:00:00Z`);
  for (let distance = 1; distance <= 14; distance += 1) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const candidate = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getUTCDay();
    const federalHoliday = state.plan.holidays.some(
      (holiday) => holiday.date === candidate && holiday.status === "verified_federal",
    );
    if (weekday !== 0 && weekday !== 6 && !federalHoliday && !(state.calendarClosures ?? []).some((closure) => closure.date === candidate)) {
      return candidate;
    }
  }
  return null;
}

function moveGeneratedEventsOffClosures(
  state: PlanYearState,
  events: ProposedEvent[],
): ProposedEvent[] {
  return events.map((event) => {
    const closure = (state.calendarClosures ?? []).find((item) => item.date === event.date);
    if (!closure) return event;
    const alternative = nextDateOutsideClosures(state, event.date);
    if (!alternative) return {
      ...event,
      status: "blocked",
      conflicts: [...event.conflicts, {
        id: `${event.id}-calendar-closure`,
        type: "blackout",
        severity: "blocked",
        summary: `${closure.label} blocks this occurrence.`,
        detail: "No open business day was found within the next two weeks.",
      }],
    };
    return {
      ...event,
      date: alternative,
      conflicts: [...event.conflicts, {
        id: `${event.id}-calendar-closure-move`,
        type: "automatic_move",
        severity: "warning",
        summary: `${closure.label} moved this occurrence.`,
        detail: `The generated date ${event.date} is an LSS closure, so the working placement moved to ${alternative}.`,
      }],
      alternatives: [{ date: alternative, reason: `Recommended business day after ${closure.label}.` }, ...event.alternatives],
      explanation: `${event.explanation} The generated date was an LSS closure, so this working occurrence moved to ${alternative}.`,
    };
  });
}

function intervalMonths(startMonth: number, interval: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) =>
    ((startMonth - 1 + index * interval) % 12) + 1,
  ).sort((left, right) => left - right);
}

function dateSequence(count: number, weekday: number, everyDays?: number): string[] {
  if (count <= 0) return [];
  const first = new Date(Date.UTC(2027, 0, 1, 12));
  while (first.getUTCDay() !== weekday) first.setUTCDate(first.getUTCDate() + 1);
  const interval = everyDays ?? Math.max(1, Math.floor(365 / count));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(date.getUTCDate() + index * interval);
    return date.toISOString().slice(0, 10);
  }).filter((date) => date.startsWith("2027-"));
}

function templateWeekday(template: MeetingTemplate, rule: WorkingMeetingRule): number {
  if (rule.weekday !== undefined) return rule.weekday;
  if ("weekday" in template.generation) return template.generation.weekday;
  const first = template.generation.type === "fixed_dates"
    ? template.generation.dates[0]
    : null;
  return first ? new Date(`${first}T12:00:00Z`).getUTCDay() : 2;
}

function scheduleGeneration(
  preset: CadencePreset,
  count: number,
  weekday: number,
  startMonth: number,
  ordinal: number,
): GenerationRule {
  if (preset === "weekly") {
    return { type: "fixed_dates", dates: dateSequence(count, weekday, 7) };
  }
  if (preset === "biweekly") {
    return { type: "fixed_dates", dates: dateSequence(count, weekday, 14) };
  }
  const months = preset === "monthly"
    ? Array.from({ length: 12 }, (_, index) => index + 1)
    : preset === "every_other_month"
      ? intervalMonths(startMonth, 2, 6)
      : preset === "quarterly"
        ? intervalMonths(startMonth, 3, 4)
        : preset === "semiannual"
          ? intervalMonths(startMonth, 6, 2)
          : monthsForCount(count, startMonth);
  if (count <= 12) {
    return { type: "nth_weekday", months: months.slice(0, count), ordinal, weekday };
  }
  return { type: "fixed_dates", dates: dateSequence(count, weekday) };
}

export function updateTemplateSchedule(
  state: PlanYearState,
  templateId: string,
  patch: {
    cadencePreset?: CadencePreset;
    annualCount?: number;
    startMonth?: number;
    ordinal?: number;
    weekday?: number;
  },
): PlanYearState {
  const template = meetingTemplatesForState(state).find(
    (item) => item.id === templateId,
  );
  if (!template) throw new Error(`Meeting template ${templateId} was not found.`);
  const currentEvents = state.plan.events.filter(
    (event) => event.templateId === templateId && !event.isPlaceholder,
  );
  const currentRule = state.workingRules[templateId] ?? {};
  const requestedPreset = patch.cadencePreset ?? currentRule.cadencePreset ?? "custom";
  const canonicalCount = requestedPreset === "custom"
    ? undefined
    : CADENCE_COUNTS[requestedPreset];
  const annualCount = Math.max(
    1,
    Math.min(52, patch.annualCount ?? canonicalCount ?? currentRule.annualCount ?? currentEvents.length),
  );
  const cadencePreset = patch.annualCount !== undefined && patch.cadencePreset === undefined
    ? "custom"
    : requestedPreset;
  const weekday = patch.weekday ?? templateWeekday(template, currentRule);
  const templateMonths = "months" in template.generation ? template.generation.months : [];
  const startMonth = Math.max(
    1,
    Math.min(12, patch.startMonth ?? currentRule.startMonth ?? templateMonths[0] ?? 1),
  );
  const ordinal = patch.ordinal ?? currentRule.ordinal ?? (
    "ordinal" in template.generation ? template.generation.ordinal : 2
  );
  const generation = scheduleGeneration(
    cadencePreset,
    annualCount,
    weekday,
    startMonth,
    ordinal,
  );
  const generated = moveGeneratedEventsOffClosures(state, generateEventsForTemplate({
    ...template,
    generation,
    cadence: CADENCE_LABELS[cadencePreset],
    ...(currentRule.durationMinutes !== undefined
      ? { durationMinutes: currentRule.durationMinutes }
      : {}),
    ...(currentRule.startTime !== undefined ? { startTime: currentRule.startTime } : {}),
  }, state.plan.holidays));
  const removedIds = new Set(
    state.plan.events.filter((event) => event.templateId === templateId).map((event) => event.id),
  );
  const events = [
    ...state.plan.events.filter((event) => event.templateId !== templateId),
    ...generated,
  ].sort((left, right) => left.date.localeCompare(right.date));
  return {
    ...state,
    plan: { ...state.plan, events },
    workingRules: {
      ...state.workingRules,
      [templateId]: {
        ...currentRule,
        cadencePreset,
        annualCount: generated.length,
        cadence: CADENCE_LABELS[cadencePreset],
        startMonth,
        ordinal,
        weekday,
      },
    },
    eventOverrides: Object.fromEntries(
      Object.entries(state.eventOverrides).filter(([eventId]) => !removedIds.has(eventId)),
    ),
    hiddenEventIds: state.hiddenEventIds.filter((eventId) => !removedIds.has(eventId)),
  };
}

export interface BulkUpdateResult {
  state: PlanYearState;
  includedEventIds: string[];
  excludedEventIds: string[];
}

export function bulkUpdateByExactTitle(
  state: PlanYearState,
  exactTitle: string,
  patch: PlanEventOverride,
): BulkUpdateResult {
  const eligible = visiblePlanEvents(state).filter(
    (event) => event.name === exactTitle || resolvePlanEvent(state, event.id).title === exactTitle,
  );
  const includedEventIds = eligible
    .filter((event) => resolvePlanEvent(state, event.id).title === exactTitle)
    .map((event) => event.id);
  const excludedEventIds = eligible
    .filter((event) => resolvePlanEvent(state, event.id).title !== exactTitle)
    .map((event) => event.id);
  let updated = state;
  for (const eventId of includedEventIds) {
    updated = updateEvent(updated, eventId, patch);
  }
  return { state: updated, includedEventIds, excludedEventIds };
}

export function proposeEventMove(
  state: PlanYearState,
  eventId: string,
  date: string,
): PlanChangeProposal {
  const event = eventById(state, eventId);
  if (isEventLocked(state, event)) {
    return {
      valid: false,
      summary: "This meeting is in a confirmed layer.",
      reason: "Reopen the confirmed layer before moving this meeting.",
      changes: [],
    };
  }
  if (!/^2027-\d{2}-\d{2}$/.test(date)) {
    return {
      valid: false,
      summary: "The proposed date is outside the 2027 plan.",
      reason: "Choose a valid date in calendar year 2027.",
      changes: [],
    };
  }
  const holiday = state.plan.holidays.find(
    (item) => item.date === date && item.status === "verified_federal",
  );
  if (holiday) {
    return {
      valid: false,
      summary: `${holiday.name} is unavailable.`,
      reason: "A verified federal holiday is a hard stop.",
      changes: [],
    };
  }
  const closure = (state.calendarClosures ?? []).find((item) => item.date === date);
  if (closure) {
    return {
      valid: false,
      summary: `${closure.label} is unavailable.`,
      reason: "An LSS closure is a hard stop.",
      changes: [],
    };
  }
  return {
    valid: true,
    summary: `Move ${resolvePlanEvent(state, eventId).title} to ${date}.`,
    changes: [{ eventId, patch: { date } }],
  };
}

export function applyPlanProposal(
  state: PlanYearState,
  proposal: PlanChangeProposal,
): PlanYearState {
  if (!proposal.valid) throw new Error(proposal.reason ?? "The proposal is invalid.");
  const baseState = proposal.settingsPatch
    ? createPlanYearState(
        generateCalendarPlan(
          { ...state.plan.settings, ...proposal.settingsPatch },
          [],
          {},
          {
            templates: state.plan.templates,
            holidays: state.plan.holidays,
            assumptions: state.plan.assumptions,
          },
        ),
      )
    : state;
  return proposal.changes.reduce(
    (current, change) => updateEvent(current, change.eventId, change.patch),
    baseState,
  );
}

export interface ManualEventMoveResult {
  state: PlanYearState;
  proposal: PlanChangeProposal;
}

export function applyManualEventMove(
  state: PlanYearState,
  eventId: string,
  date: string,
): ManualEventMoveResult {
  const proposal = proposeEventMove(state, eventId, date);
  return {
    state: proposal.valid ? applyPlanProposal(state, proposal) : state,
    proposal,
  };
}
