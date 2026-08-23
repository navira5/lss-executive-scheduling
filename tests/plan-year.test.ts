import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentContext,
  interpretDemoRequest,
  validateAgentProposal,
} from "@/lib/plan-agent";
import {
  advancePlanStep,
  applyManualEventMove,
  applyPlanProposal,
  bulkUpdateByExactTitle,
  clearActivePhase,
  confirmActivePhase,
  createPlanYearState,
  navigateToPhase,
  proposeEventMove,
  regenerateActivePhase,
  reopenPhase,
  resolvePlanEvent,
  updateEvent,
  updateTemplateSchedule,
  updateWorkingRule,
  visiblePlanEvents,
} from "@/lib/plan-year";
import { generateCalendarPlan } from "@/lib/scheduling";
import type { ScenarioSettings } from "@/lib/types";

const baseline: ScenarioSettings = {
  boardScenario: "continuity",
  allStaffPattern: "detailed_calendar",
};

test("starts with the complete Board layer and hides later layers", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const visible = visiblePlanEvents(state);

  assert.equal(state.activePhase, "board");
  assert.equal(state.activeStepId, "board-calendar");
  assert.ok(visible.some((event) => event.templateId === "full-board"));
  assert.ok(visible.some((event) => event.templateId === "board-retreat"));
  assert.ok(visible.some((event) => event.templateId === "critical-checkin"));
  assert.ok(visible.some((event) => event.templateId === "executive-committee"));
  assert.ok(visible.some((event) => event.templateId === "finance-committee"));
  assert.ok(!visible.some((event) => event.templateId === "executive-team"));
  assert.ok(!visible.some((event) => event.templateId === "all-staff"));
});

test("Board governance groups are visible together as one planning layer", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const templateIds = new Set(visiblePlanEvents(state).map((event) => event.templateId));

  assert.ok(templateIds.has("full-board"));
  assert.ok(templateIds.has("executive-committee"));
  assert.ok(templateIds.has("finance-committee"));
  assert.ok(templateIds.has("health-programs"));
  assert.ok(templateIds.has("talent-risk"));
});

test("confirming Board unlocks Executive and preserves locked Board anchors", () => {
  let state = createPlanYearState(generateCalendarPlan(baseline));
  while (state.activeStepIndex < state.phaseSteps.length - 1) {
    state = advancePlanStep(state);
  }
  const executive = confirmActivePhase(state);
  const visible = visiblePlanEvents(executive);

  assert.equal(executive.activePhase, "executive");
  assert.equal(executive.activeStepId, "executive-team");
  assert.deepEqual(executive.confirmedPhases, ["board"]);
  assert.ok(visible.some((event) => event.templateId === "full-board"));
  assert.ok(visible.some((event) => event.templateId === "executive-team"));
  assert.ok(!visible.some((event) => event.templateId === "all-staff"));
});

test("confirms the complete active layer without artificial substep gates", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const executive = confirmActivePhase(state);

  assert.equal(executive.activePhase, "executive");
  assert.deepEqual(executive.confirmedPhases, ["board"]);
});

test("bulk title and message updates exclude a custom-title instance", () => {
  const initial = createPlanYearState(generateCalendarPlan(baseline));
  const board = visiblePlanEvents(initial).filter(
    (event) => event.templateId === "full-board",
  );
  assert.ok(board.length > 1);

  const customized = updateEvent(initial, board[0].id, {
    title: "Annual Governance Session",
  });
  const result = bulkUpdateByExactTitle(customized, "Full Board Meeting", {
    title: "2027 Full Board Meeting",
    message: "Updated invitation message",
  });

  assert.equal(
    resolvePlanEvent(result.state, board[0].id).title,
    "Annual Governance Session",
  );
  assert.ok(
    board
      .slice(1)
      .every(
        (event) =>
          resolvePlanEvent(result.state, event.id).title ===
          "2027 Full Board Meeting",
      ),
  );
  assert.ok(
    board
      .slice(1)
      .every(
        (event) =>
          resolvePlanEvent(result.state, event.id).message ===
          "Updated invitation message",
      ),
  );
  assert.deepEqual(result.excludedEventIds, [board[0].id]);
});

test("rejects a drag to a verified federal holiday", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const event = visiblePlanEvents(state).find(
    (item) => item.templateId === "full-board",
  );
  assert.ok(event);

  const proposal = proposeEventMove(state, event.id, "2027-01-18");

  assert.equal(proposal.valid, false);
  assert.match(proposal.reason ?? "", /federal holiday/i);
  assert.deepEqual(state.eventOverrides, {});
});

test("applies a valid move only after the proposal is accepted", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const event = visiblePlanEvents(state).find(
    (item) => item.templateId === "full-board",
  );
  assert.ok(event);
  const proposal = proposeEventMove(state, event.id, "2027-01-13");

  assert.equal(proposal.valid, true);
  assert.equal(resolvePlanEvent(state, event.id).date, event.date);

  const applied = applyPlanProposal(state, proposal);
  assert.equal(resolvePlanEvent(applied, event.id).date, "2027-01-13");
});

test("a manual calendar drop applies immediately because the drag is the approval", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const event = visiblePlanEvents(state).find(
    (item) => item.templateId === "full-board",
  );
  assert.ok(event);

  const result = applyManualEventMove(state, event.id, "2027-01-13");

  assert.equal(result.proposal.valid, true);
  assert.equal(resolvePlanEvent(result.state, event.id).date, "2027-01-13");
});

test("a manual calendar drop still fails closed on a federal holiday", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const event = visiblePlanEvents(state).find(
    (item) => item.templateId === "full-board",
  );
  assert.ok(event);

  const result = applyManualEventMove(state, event.id, "2027-01-18");

  assert.equal(result.proposal.valid, false);
  assert.equal(resolvePlanEvent(result.state, event.id).date, event.date);
});

test("confirmed Board meetings cannot be edited without reopening the layer", () => {
  let state = createPlanYearState(generateCalendarPlan(baseline));
  const event = visiblePlanEvents(state).find(
    (item) => item.templateId === "full-board",
  );
  assert.ok(event);
  while (state.activeStepIndex < state.phaseSteps.length - 1) {
    state = advancePlanStep(state);
  }
  state = confirmActivePhase(state);

  assert.throws(
    () => updateEvent(state, event.id, { startTime: "16:30" }),
    /reopen Board & Governance/i,
  );
});

test("a confirmed layer becomes editable again when revisited without losing confirmation", () => {
  let state = createPlanYearState(generateCalendarPlan(baseline));
  const event = visiblePlanEvents(state).find((item) => item.templateId === "full-board");
  assert.ok(event);
  state = confirmActivePhase(state);

  const revisited = navigateToPhase(state, "board");
  const updated = updateEvent(revisited, event.id, { startTime: "16:30" });

  assert.deepEqual(updated.confirmedPhases, ["board"]);
  assert.equal(resolvePlanEvent(updated, event.id).startTime, "16:30");
});

test("a working weekday rule regenerates the group without becoming a 2027 override", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const updated = updateWorkingRule(state, "full-board", { weekday: 3 });
  const boardMeetings = visiblePlanEvents(updated).filter(
    (event) => event.templateId === "full-board",
  );

  assert.ok(boardMeetings.length > 0);
  assert.ok(
    boardMeetings.every(
      (event) => new Date(`${resolvePlanEvent(updated, event.id).date}T12:00:00Z`).getUTCDay() === 3,
    ),
  );
  assert.deepEqual(updated.eventOverrides, {});
  assert.ok(
    boardMeetings.every((event) => resolvePlanEvent(updated, event.id).ruleStatus === "needs_validation"),
  );
});

test("cadence and annual count regenerate actual meeting occurrences", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const everyOtherMonth = updateTemplateSchedule(state, "full-board", {
    cadencePreset: "every_other_month",
    annualCount: 6,
  });
  const recurring = everyOtherMonth.plan.events.filter(
    (event) => event.templateId === "full-board",
  );

  assert.equal(recurring.length, 6);
  assert.deepEqual(
    recurring.map((event) => Number(event.date.slice(5, 7))),
    [1, 3, 5, 7, 9, 11],
  );
  assert.equal(everyOtherMonth.workingRules["full-board"].annualCount, 6);
  assert.equal(
    everyOtherMonth.workingRules["full-board"].cadencePreset,
    "every_other_month",
  );
  assert.deepEqual(everyOtherMonth.eventOverrides, {});

  const custom = updateTemplateSchedule(everyOtherMonth, "full-board", {
    annualCount: 8,
  });
  assert.equal(
    custom.plan.events.filter((event) => event.templateId === "full-board").length,
    8,
  );
  assert.equal(custom.workingRules["full-board"].cadencePreset, "custom");

  const evenMonths = updateTemplateSchedule(state, "full-board", {
    cadencePreset: "every_other_month",
    startMonth: 2,
  });
  assert.deepEqual(
    evenMonths.plan.events
      .filter((event) => event.templateId === "full-board")
      .map((event) => Number(event.date.slice(5, 7))),
    [2, 4, 6, 8, 10, 12],
  );
});

test("interprets the golden Board check-in command without applying it", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const proposal = interpretDemoRequest(
    "Move all Board check-ins to 4:30 and keep them virtual",
    buildAgentContext(state),
  );

  assert.equal(proposal.kind, "bulk_update");
  if (proposal.kind !== "bulk_update") return;
  assert.equal(proposal.patch.startTime, "16:30");
  assert.equal(proposal.patch.modality, "Virtual");
  assert.ok(proposal.eventIds.length > 1);
  assert.ok(
    proposal.eventIds.every((id) =>
      id.startsWith("critical-checkin-"),
    ),
  );
  assert.deepEqual(state.eventOverrides, {});
});

test("interprets a combined Board structure and weekday request", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const proposal = interpretDemoRequest(
    "move all board meetings to Wednesdays. use four regular meetings and two longer retreats",
    buildAgentContext(state),
  );

  assert.equal(proposal.kind, "configure_board");
  if (proposal.kind !== "configure_board") return;
  assert.equal(proposal.boardScenario, "recent_direction");
  assert.equal(proposal.weekday, 3);

  const validation = validateAgentProposal(state, proposal);
  assert.equal(validation.valid, true);
  assert.equal(validation.settingsPatch?.boardScenario, "recent_direction");
  assert.equal(validation.changes.length, 12);

  const applied = applyPlanProposal(state, validation);
  const boardLayer = visiblePlanEvents(applied).filter((event) =>
    ["full-board", "board-retreat", "critical-checkin"].includes(event.templateId),
  );
  assert.equal(applied.plan.settings.boardScenario, "recent_direction");
  assert.equal(boardLayer.filter((event) => event.templateId === "full-board").length, 4);
  assert.equal(boardLayer.filter((event) => event.templateId === "board-retreat").length, 2);
  assert.ok(
    boardLayer.every(
      (event) => new Date(`${resolvePlanEvent(applied, event.id).date}T12:00:00Z`).getUTCDay() === 3,
    ),
  );
  assert.ok(
    boardLayer.every(
      (event) => resolvePlanEvent(applied, event.id).ruleStatus === "needs_validation",
    ),
  );
  assert.deepEqual(applied.workingRules, {});
});

test("agent proposals cannot bypass federal-holiday validation", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const event = visiblePlanEvents(state).find(
    (item) => item.templateId === "full-board",
  );
  assert.ok(event);
  const result = validateAgentProposal(state, {
    kind: "move",
    eventIds: [event.id],
    date: "2027-01-18",
  });

  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /federal holiday/i);
});

test("ambiguous demo requests ask a question instead of inventing a change", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const proposal = interpretDemoRequest(
    "Make the Board meetings better",
    buildAgentContext(state),
  );

  assert.equal(proposal.kind, "clarify");
  if (proposal.kind === "clarify") {
    assert.match(proposal.question, /what would you like to change/i);
  }
});

test("clearing and regenerating affect only the active phase", () => {
  const initial = createPlanYearState(generateCalendarPlan(baseline));
  const cleared = clearActivePhase(initial);

  assert.equal(visiblePlanEvents(cleared).length, 0);
  assert.ok(
    cleared.plan.events.some((event) => event.templateId === "executive-team"),
  );

  const regenerated = regenerateActivePhase(cleared);
  assert.ok(
    visiblePlanEvents(regenerated).some(
      (event) => event.templateId === "full-board",
    ),
  );
  assert.ok(
    regenerated.plan.events.some(
      (event) => event.templateId === "executive-team",
    ),
  );
});

test("reopening Board removes downstream confirmation and returns to its final step", () => {
  let state = createPlanYearState(generateCalendarPlan(baseline));
  while (state.activeStepIndex < state.phaseSteps.length - 1) {
    state = advancePlanStep(state);
  }
  state = confirmActivePhase(state);
  while (state.activeStepIndex < state.phaseSteps.length - 1) {
    state = advancePlanStep(state);
  }
  state = confirmActivePhase(state);

  const reopened = reopenPhase(state, "board");

  assert.equal(reopened.activePhase, "board");
  assert.equal(reopened.activeStepId, "other-board-committees");
  assert.deepEqual(reopened.confirmedPhases, []);
});

test("working rule edits update matching instances without promoting rule authority", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const updated = updateWorkingRule(state, "critical-checkin", {
    startTime: "16:30",
    durationMinutes: 45,
    modality: "Virtual",
    location: "Microsoft Teams",
    attendees: ["Full Board", "CEO"],
    distributionLists: ["Board Distribution List"],
  });
  const checkIns = visiblePlanEvents(updated).filter(
    (event) => event.templateId === "critical-checkin",
  );

  assert.ok(checkIns.length > 1);
  assert.ok(
    checkIns.every((event) => resolvePlanEvent(updated, event.id).startTime === "16:30"),
  );
  assert.ok(
    checkIns.every((event) => resolvePlanEvent(updated, event.id).durationMinutes === 45),
  );
  assert.ok(
    checkIns.every(
      (event) => resolvePlanEvent(updated, event.id).ruleStatus === "needs_validation",
    ),
  );
});
