import type { CalendarPlan, ProposedEvent } from "@/lib/types";

export type PlanPhase = "board" | "executive" | "organization" | "review";

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
  note?: string;
}

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
}

export const PHASE_LABELS: Record<PlanPhase, string> = {
  board: "Board & Governance",
  executive: "Executive Leadership",
  organization: "Organization & Operations",
  review: "Final Review",
};

export const PHASE_ORDER: PlanPhase[] = [
  "board",
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
      id: "other-board-committees",
      label: "Other Board committees",
      meetingLabel: "Programs, Talent & Risk, and orientation",
      question:
        "Which remaining Board committee and orientation patterns should carry into 2027?",
      templateIds: ["health-programs", "talent-risk", "board-orientation"],
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
  });
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
  });
}

export function confirmActivePhase(state: PlanYearState): PlanYearState {
  if (state.activeStepIndex < state.phaseSteps.length - 1) {
    throw new Error(
      `Finish the ${PHASE_LABELS[state.activePhase]} steps before confirming.`,
    );
  }
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
  });
}

function templateIdsForPhase(phase: PlanPhase): Set<string> {
  return new Set(PLAN_STEPS[phase].flatMap((step) => step.templateIds));
}

function isConfirmedEvent(state: PlanYearState, event: ProposedEvent): boolean {
  return state.confirmedPhases.some((phase) =>
    templateIdsForPhase(phase).has(event.templateId),
  );
}

export function visiblePlanEvents(state: PlanYearState): ProposedEvent[] {
  if (state.activePhase === "review") return state.plan.events;
  const activeTemplateIds = new Set(
    state.phaseSteps
      .slice(0, state.activeStepIndex + 1)
      .flatMap((step) => step.templateIds),
  );
  return state.plan.events.filter(
    (event) =>
      !state.hiddenEventIds.includes(event.id) &&
      (isConfirmedEvent(state, event) || activeTemplateIds.has(event.templateId)),
  );
}

export function isEventLocked(
  state: PlanYearState,
  event: ProposedEvent,
): boolean {
  return isConfirmedEvent(state, event);
}

function eventById(state: PlanYearState, eventId: string): ProposedEvent {
  const event = state.plan.events.find((item) => item.id === eventId);
  if (!event) throw new Error(`Meeting ${eventId} was not found.`);
  return event;
}

function phaseForTemplate(templateId: string): PlanPhase | null {
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
  const override = state.eventOverrides[eventId] ?? {};
  return {
    ...event,
    ...override,
    title: override.title ?? event.name,
    message: override.message ?? event.purpose,
    attendees: override.attendees ?? [event.attendeeGroup],
    distributionLists: override.distributionLists ?? [],
    locked: isEventLocked(state, event),
  };
}

export function updateEvent(
  state: PlanYearState,
  eventId: string,
  patch: PlanEventOverride,
): PlanYearState {
  const event = eventById(state, eventId);
  if (isEventLocked(state, event)) {
    const phase = phaseForTemplate(event.templateId);
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
  return templateIdsForPhase(state.activePhase);
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
  });
}

export function updateWorkingRule(
  state: PlanYearState,
  templateId: string,
  patch: WorkingMeetingRule,
): PlanYearState {
  const nextRule = { ...state.workingRules[templateId], ...patch };
  let updated: PlanYearState = {
    ...state,
    workingRules: { ...state.workingRules, [templateId]: nextRule },
  };
  const eventPatch = eventPatchForRule(nextRule);
  for (const event of state.plan.events.filter(
    (item) => item.templateId === templateId && !isEventLocked(state, item),
  )) {
    updated = updateEvent(updated, event.id, eventPatch);
  }
  return updated;
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
  return proposal.changes.reduce(
    (current, change) => updateEvent(current, change.eventId, change.patch),
    state,
  );
}
