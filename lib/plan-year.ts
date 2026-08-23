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
  });
}

export function advancePlanStep(state: PlanYearState): PlanYearState {
  if (state.activeStepIndex >= state.phaseSteps.length - 1) return state;
  return stateAt({
    plan: state.plan,
    activePhase: state.activePhase,
    activeStepIndex: state.activeStepIndex + 1,
    confirmedPhases: state.confirmedPhases,
  });
}

export function previousPlanStep(state: PlanYearState): PlanYearState {
  if (state.activeStepIndex === 0) return state;
  return stateAt({
    plan: state.plan,
    activePhase: state.activePhase,
    activeStepIndex: state.activeStepIndex - 1,
    confirmedPhases: state.confirmedPhases,
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
      isConfirmedEvent(state, event) || activeTemplateIds.has(event.templateId),
  );
}

export function isEventLocked(
  state: PlanYearState,
  event: ProposedEvent,
): boolean {
  return isConfirmedEvent(state, event);
}
