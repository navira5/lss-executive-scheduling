import { buildMeetingTemplates } from "@/data/source-data";
import {
  isEventLocked,
  proposeEventMove,
  resolvePlanEvent,
  type PlanChangeProposal,
  type PlanEventOverride,
  type PlanYearState,
  type WorkingMeetingRule,
} from "@/lib/plan-year";

export interface AgentEventContext {
  id: string;
  templateId: string;
  title: string;
  date: string;
  startTime: string | null;
  durationMinutes: number;
  modality: string;
  location: string;
  locked: boolean;
}

export interface AgentRuleContext {
  templateId: string;
  name: string;
  cadence: string;
  flexibility: string;
  ruleStatus: string;
  owner: string;
  attendeeGroup: string;
}

export interface PlanAgentContext {
  activePhase: string;
  activeStepId: string;
  activeStepLabel: string;
  question: string;
  rules: AgentRuleContext[];
  events: AgentEventContext[];
  holidays: { date: string; name: string; status: string }[];
}

export type AgentProposal =
  | {
      kind: "move";
      eventIds: string[];
      date: string;
      startTime?: string;
    }
  | {
      kind: "bulk_update";
      eventIds: string[];
      exactTitle: string;
      patch: PlanEventOverride;
    }
  | {
      kind: "update_rule";
      templateId: string;
      patch: WorkingMeetingRule;
    }
  | { kind: "regenerate_layer" }
  | { kind: "clear_layer" }
  | { kind: "clarify"; question: string }
  | { kind: "cannot_complete"; explanation: string };

export function buildAgentContext(state: PlanYearState): PlanAgentContext {
  const activeStep = state.phaseSteps[state.activeStepIndex];
  const templateIds = new Set(activeStep.templateIds);
  const templates = buildMeetingTemplates(state.plan.settings).filter((template) =>
    templateIds.has(template.id),
  );
  const events = state.plan.events
    .filter((event) => {
      const inCurrentStep = templateIds.has(event.templateId);
      return inCurrentStep || isEventLocked(state, event);
    })
    .map((event) => {
      const resolved = resolvePlanEvent(state, event.id);
      return {
        id: resolved.id,
        templateId: resolved.templateId,
        title: resolved.title,
        date: resolved.date,
        startTime: resolved.startTime,
        durationMinutes: resolved.durationMinutes,
        modality: resolved.modality,
        location: resolved.location,
        locked: resolved.locked,
      };
    });
  return {
    activePhase: state.activePhase,
    activeStepId: activeStep.id,
    activeStepLabel: activeStep.label,
    question: activeStep.question,
    rules: templates.map((template) => ({
      templateId: template.id,
      name: template.name,
      cadence: template.cadence,
      flexibility: template.flexibility,
      ruleStatus: template.ruleStatus,
      owner: template.owner,
      attendeeGroup: template.attendeeGroup,
    })),
    events,
    holidays: state.plan.holidays.map((holiday) => ({ ...holiday })),
  };
}

function inferTime(request: string, events: AgentEventContext[]): string | null {
  const match = request.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3]?.toLowerCase().replaceAll(".", "");
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour < 8) {
    const existingAfternoon = events.some((event) => {
      const existingHour = Number(event.startTime?.slice(0, 2) ?? "0");
      return existingHour >= 12;
    });
    if (existingAfternoon) hour += 12;
  }
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function interpretDemoRequest(
  request: string,
  context: PlanAgentContext,
): AgentProposal {
  const normalized = request.toLowerCase();
  const checkIns = context.events.filter(
    (event) => event.templateId === "critical-checkin" && !event.locked,
  );
  if (
    checkIns.length > 0 &&
    /check[ -]?ins?/.test(normalized) &&
    (normalized.includes("time") || /\d{1,2}:?\d{0,2}/.test(normalized))
  ) {
    const startTime = inferTime(request, checkIns);
    if (!startTime) {
      return { kind: "clarify", question: "What start time should the Board check-ins use?" };
    }
    return {
      kind: "bulk_update",
      eventIds: checkIns.map((event) => event.id),
      exactTitle: "Board Critical Issue Check-in",
      patch: {
        startTime,
        ...(normalized.includes("virtual") ? { modality: "Virtual" } : {}),
      },
    };
  }
  return {
    kind: "clarify",
    question:
      "What would you like to change: the dates, time, duration, location, attendees, title, or invitation message?",
  };
}

export function validateAgentProposal(
  state: PlanYearState,
  proposal: AgentProposal,
): PlanChangeProposal {
  if (proposal.kind === "clarify") {
    return { valid: false, summary: proposal.question, reason: proposal.question, changes: [] };
  }
  if (proposal.kind === "cannot_complete") {
    return {
      valid: false,
      summary: proposal.explanation,
      reason: proposal.explanation,
      changes: [],
    };
  }
  if (proposal.kind === "move") {
    const proposals = proposal.eventIds.map((eventId) =>
      proposeEventMove(state, eventId, proposal.date),
    );
    const invalid = proposals.find((item) => !item.valid);
    if (invalid) return invalid;
    return {
      valid: true,
      summary: `Move ${proposal.eventIds.length} meeting${proposal.eventIds.length === 1 ? "" : "s"}.`,
      changes: proposals.flatMap((item) => item.changes).map((change) => ({
        ...change,
        patch: {
          ...change.patch,
          ...(proposal.startTime ? { startTime: proposal.startTime } : {}),
        },
      })),
    };
  }
  if (proposal.kind === "bulk_update") {
    if (proposal.eventIds.length === 0) {
      return {
        valid: false,
        summary: "No matching meetings were found.",
        reason: "No active-layer meeting matches this request.",
        changes: [],
      };
    }
    for (const eventId of proposal.eventIds) {
      const resolved = resolvePlanEvent(state, eventId);
      if (resolved.locked) {
        return {
          valid: false,
          summary: `${resolved.title} is locked.`,
          reason: "Reopen the confirmed planning layer before changing it.",
          changes: [],
        };
      }
      if (proposal.patch.date) {
        const move = proposeEventMove(state, eventId, proposal.patch.date);
        if (!move.valid) return move;
      }
    }
    return {
      valid: true,
      summary: `Update ${proposal.eventIds.length} meeting${proposal.eventIds.length === 1 ? "" : "s"} titled “${proposal.exactTitle}”.`,
      changes: proposal.eventIds.map((eventId) => ({ eventId, patch: proposal.patch })),
    };
  }
  return {
    valid: true,
    summary:
      proposal.kind === "update_rule"
        ? "Update the working rule and regenerate this layer."
        : proposal.kind === "clear_layer"
          ? "Clear the active planning layer."
          : "Regenerate the active planning layer.",
    changes: [],
  };
}
