import assert from "node:assert/strict";
import test from "node:test";

import { buildMeetingTemplates } from "@/data/source-data";
import { ruleSummaryFor } from "@/lib/rule-summaries";

const templates = buildMeetingTemplates({
  boardScenario: "recent_direction",
  allStaffPattern: "detailed_calendar",
});

function summary(templateId: string) {
  const template = templates.find((item) => item.id === templateId);
  assert.ok(template);
  return ruleSummaryFor(template);
}

test("Full Board summary separates the historical retreat from regular meetings", () => {
  const board = summary("full-board");

  assert.equal(board.title, "Full Board Meeting");
  assert.deepEqual(board.rows.map((row) => row.label), [
    "Purpose",
    "Who attends",
    "Historical cadence",
    "Historical time",
    "Format",
    "2027 proposal",
    "Needs validation",
  ]);
  assert.match(
    board.rows.find((row) => row.label === "Historical cadence")?.value ?? "",
    /May 2026 was converted to a retreat/,
  );
});

test("Board retreat summary shows only retreat-specific evidence and decisions", () => {
  const retreat = summary("board-retreat");

  assert.equal(retreat.title, "Full Board Retreat");
  assert.equal(
    retreat.rows.find((row) => row.label === "2027 proposal")?.value,
    "2 retreats per year",
  );
  assert.equal(
    retreat.rows.find((row) => row.label === "Needs validation")?.value,
    "Retreat months",
  );
});

test("Critical Issue summary keeps the alternating-month historical pattern", () => {
  const checkIn = summary("critical-checkin");

  assert.equal(checkIn.title, "Critical Issue Check-In");
  assert.match(
    checkIn.rows.find((row) => row.label === "Historical cadence")?.value ?? "",
    /Feb, Apr, Jun, Aug, Oct, and Dec/,
  );
  assert.equal(
    checkIn.rows.find((row) => row.label === "2027 proposal")?.value,
    "6 per year",
  );
});
