import assert from "node:assert/strict";
import test from "node:test";

import { holidays2027 } from "@/data/source-data";
import {
  applyLocalDecision,
  exportPlanCsv,
  generateCalendarPlan,
} from "@/lib/scheduling";
import type { ScenarioSettings } from "@/lib/types";

const baseline: ScenarioSettings = {
  boardScenario: "continuity",
  allStaffPattern: "detailed_calendar",
};

test("uses the verified 2027 Labor Day date rather than copying the bad 2026 label", () => {
  assert.ok(
    holidays2027.some(
      (holiday) =>
        holiday.name === "Labor Day" && holiday.date === "2027-09-06",
    ),
  );
  assert.ok(!holidays2027.some((holiday) => holiday.date === "2027-09-01"));
});

test("loads every OPM federal holiday observed during calendar year 2027", () => {
  const expected = [
    "2027-01-01",
    "2027-01-18",
    "2027-02-15",
    "2027-05-31",
    "2027-06-18",
    "2027-07-05",
    "2027-09-06",
    "2027-10-11",
    "2027-11-11",
    "2027-11-25",
    "2027-12-24",
    "2027-12-31",
  ];
  const verified = holidays2027
    .filter((holiday) => holiday.status === "verified_federal")
    .map((holiday) => holiday.date);

  assert.deepEqual(verified, expected);
});

test("moves recurring meetings off the completed federal holiday set", () => {
  const plan = generateCalendarPlan(baseline);
  const expectedMoves = new Map([
    ["2027-02-15", "2027-02-16"],
    ["2027-10-11", "2027-10-12"],
  ]);
  for (const [originalDate, generatedDate] of expectedMoves) {
    const executiveTeam = plan.events.find(
      (event) =>
        event.templateId === "executive-team" &&
        event.originalDate === originalDate,
    );
    assert.ok(executiveTeam);
    assert.equal(executiveTeam.date, generatedDate);
    assert.equal(executiveTeam.status, "ready");
    assert.ok(
      executiveTeam.conflicts.some(
        (conflict) => conflict.type === "automatic_move",
      ),
    );
  }
});

test("keeps Labor Day empty and records the automatic Tuesday move", () => {
  const plan = generateCalendarPlan(baseline);
  const event = plan.events.find(
    (item) =>
      item.templateId === "executive-team" &&
      item.originalDate === "2027-09-06",
  );

  assert.ok(event);
  assert.equal(event.date, "2027-09-07");
  assert.equal(event.status, "ready");
  assert.ok(
    event.conflicts.some((conflict) => conflict.type === "automatic_move"),
  );
  assert.ok(!plan.events.some((item) => !item.isPlaceholder && item.date === "2027-09-06"));
  assert.ok(!plan.decisions.some((decision) => decision.relatedEventId === event.id));
});

test("flags the projected Good Friday Executive Retreat without inventing approval", () => {
  const plan = generateCalendarPlan(baseline);
  const event = plan.events.find(
    (item) => item.templateId === "executive-retreat" && item.date === "2027-03-26",
  );

  assert.ok(event);
  assert.equal(event.ruleStatus, "needs_validation");
  assert.ok(event.conflicts.some((conflict) => conflict.type === "holiday"));
  assert.equal(event.status, "needs_decision");
});

test("keeps QPB and BVR as blocked placeholders until their missing rules are supplied", () => {
  const plan = generateCalendarPlan(baseline);
  const qpb = plan.events.filter((item) => item.templateId === "program-briefing");
  const bvr = plan.events.filter((item) => item.templateId === "bvr");

  assert.equal(qpb.length, 4);
  assert.equal(bvr.length, 12);
  assert.ok([...qpb, ...bvr].every((event) => event.isPlaceholder));
  assert.ok([...qpb, ...bvr].every((event) => event.status === "blocked"));
  assert.ok(
    [...qpb, ...bvr].every((event) =>
      event.conflicts.some((conflict) => conflict.type === "missing_rule"),
    ),
  );
  assert.ok(
    !plan.decisions.some(
      (decision) => decision.relatedEventId && decision.title.startsWith("BVR:"),
    ),
  );
});

test("blocked open questions never claim that no conflict was detected", () => {
  const plan = generateCalendarPlan(baseline);
  const internalRisk = plan.events.find(
    (item) => item.templateId === "internal-risk",
  );

  assert.ok(internalRisk);
  assert.equal(internalRisk.status, "blocked");
  assert.ok(
    internalRisk.conflicts.some(
      (conflict) => conflict.type === "missing_rule" && conflict.severity === "blocked",
    ),
  );
  assert.doesNotMatch(internalRisk.explanation, /no detected conflict/i);
});

test("shows the September Leadership collision and protects the retreat", () => {
  const plan = generateCalendarPlan(baseline);
  const monthly = plan.events.find(
    (item) => item.templateId === "leadership-team" && item.date === "2027-09-09",
  );
  const retreat = plan.events.find(
    (item) => item.templateId === "leadership-retreat" && item.date === "2027-09-09",
  );

  assert.ok(monthly);
  assert.ok(retreat);
  assert.ok(monthly.conflicts.some((conflict) => conflict.type === "attendance"));
  assert.equal(monthly.alternatives.at(-1)?.date, "2027-09-16");
  assert.ok(!retreat.conflicts.some((conflict) => conflict.type === "attendance"));
});

test("switching the All Staff evidence source changes only the POC scenario", () => {
  const detailed = generateCalendarPlan(baseline);
  const matrix = generateCalendarPlan({
    ...baseline,
    allStaffPattern: "meeting_matrix",
  });

  const detailedEvents = detailed.events.filter((item) => item.templateId === "all-staff");
  const matrixEvents = matrix.events.filter((item) => item.templateId === "all-staff");

  assert.deepEqual(
    detailedEvents.map((event) => event.date.slice(5, 7)),
    ["01", "04", "07", "10"],
  );
  assert.deepEqual(
    matrixEvents.map((event) => event.date.slice(5, 7)),
    ["02", "05", "08", "11"],
  );
  assert.ok(detailedEvents.every((event) => event.durationMinutes === 60));
  assert.ok(matrixEvents.every((event) => event.durationMinutes === 45));
  assert.ok(matrixEvents.every((event) => event.ruleStatus === "needs_validation"));
});

test("Board scenarios remain labeled assumptions and produce their distinct structures", () => {
  const continuity = generateCalendarPlan(baseline);
  const recent = generateCalendarPlan({ ...baseline, boardScenario: "recent_direction" });

  assert.equal(
    continuity.events.filter((event) => event.templateId === "full-board").length,
    5,
  );
  assert.equal(
    continuity.events.filter((event) => event.templateId === "board-retreat").length,
    1,
  );
  assert.equal(
    recent.events.filter((event) => event.templateId === "full-board").length,
    4,
  );
  assert.equal(
    recent.events.filter((event) => event.templateId === "board-retreat").length,
    2,
  );
  assert.ok(recent.assumptions.every((assumption) => assumption.authority === "poc_only"));
});

test("a local review decision never promotes the underlying rule authority", () => {
  const original = generateCalendarPlan(baseline);
  const event = original.events.find(
    (item) =>
      item.templateId === "executive-team" &&
      item.originalDate === "2027-09-06",
  );
  assert.ok(event);

  const local = applyLocalDecision([], {
    eventId: event.id,
    action: "reviewed",
    rationale: "POC review choice",
    decidedAt: "2026-08-22T12:00:00.000Z",
  });
  const reviewed = generateCalendarPlan(baseline, local).events.find(
    (item) => item.id === event.id,
  );

  assert.ok(reviewed);
  assert.equal(reviewed.date, "2027-09-07");
  assert.equal(reviewed.status, "reviewed");
  assert.equal(reviewed.ruleStatus, "confirmed");
  assert.equal(reviewed.originalDate, "2027-09-06");
  const reviewedPlan = generateCalendarPlan(baseline, local);
  assert.ok(
    !reviewedPlan.decisions.some(
      (decision) => decision.relatedEventId === event.id,
    ),
  );
});

test("exports a reviewable CSV with provenance statuses", () => {
  const csv = exportPlanCsv(generateCalendarPlan(baseline));
  assert.match(csv, /^Date,Time,Abbreviation,Meeting,Category,Status,Rule Status,/);
  assert.match(csv, /2027-09-07,09:00,ET,Executive Team Meeting/);
  assert.match(csv, /2027-01 \(date TBD\),TBD,BVR/);
  assert.doesNotMatch(csv, /2027-01-01,TBD,BVR/);
  assert.match(csv, /needs_validation/);
});

test("books no real meeting on any verified federal observance", () => {
  const plan = generateCalendarPlan(baseline);
  const federalDates = new Set(
    holidays2027
      .filter((holiday) => holiday.status === "verified_federal")
      .map((holiday) => holiday.date),
  );

  assert.deepEqual(
    plan.events.filter(
      (event) => !event.isPlaceholder && federalDates.has(event.date),
    ),
    [],
  );
});
