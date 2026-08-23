import assert from "node:assert/strict";
import test from "node:test";

import {
  advancePlanStep,
  applyPlanProposal,
  bulkUpdateByExactTitle,
  confirmActivePhase,
  createPlanYearState,
  proposeEventMove,
  resolvePlanEvent,
  updateEvent,
  visiblePlanEvents,
} from "@/lib/plan-year";
import { generateCalendarPlan } from "@/lib/scheduling";
import type { ScenarioSettings } from "@/lib/types";

const baseline: ScenarioSettings = {
  boardScenario: "continuity",
  allStaffPattern: "detailed_calendar",
};

test("starts with the Board calendar and hides later meeting layers", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const visible = visiblePlanEvents(state);

  assert.equal(state.activePhase, "board");
  assert.equal(state.activeStepId, "board-calendar");
  assert.ok(visible.some((event) => event.templateId === "full-board"));
  assert.ok(visible.some((event) => event.templateId === "board-retreat"));
  assert.ok(visible.some((event) => event.templateId === "critical-checkin"));
  assert.ok(!visible.some((event) => event.templateId === "executive-committee"));
  assert.ok(!visible.some((event) => event.templateId === "executive-team"));
  assert.ok(!visible.some((event) => event.templateId === "all-staff"));
});

test("reveals Board committee meetings in rulebook order", () => {
  const initial = createPlanYearState(generateCalendarPlan(baseline));
  const executiveCommittee = advancePlanStep(initial);
  const finance = advancePlanStep(executiveCommittee);

  assert.equal(executiveCommittee.activeStepId, "executive-committee");
  assert.ok(
    visiblePlanEvents(executiveCommittee).some(
      (event) => event.templateId === "executive-committee",
    ),
  );
  assert.ok(
    !visiblePlanEvents(executiveCommittee).some(
      (event) => event.templateId === "finance-committee",
    ),
  );
  assert.equal(finance.activeStepId, "finance-committee");
  assert.ok(
    visiblePlanEvents(finance).some(
      (event) => event.templateId === "finance-committee",
    ),
  );
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

test("does not confirm a phase before its final scheduling step", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));

  assert.throws(
    () => confirmActivePhase(state),
    /finish the Board & Governance steps before confirming/i,
  );
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
