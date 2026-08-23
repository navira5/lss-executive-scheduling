import assert from "node:assert/strict";
import test from "node:test";

import {
  advancePlanStep,
  confirmActivePhase,
  createPlanYearState,
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
