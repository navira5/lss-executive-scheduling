import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "@/app/api/sharepoint-plan/route";
import {
  calendarPlanFromSharePoint,
  holidaysFromSharePoint,
  meetingTemplatesFromSharePoint,
  newSharePointMeetingFields,
  sharePointRuleFields,
} from "@/lib/sharepoint-plan";
import type { SharePointFields } from "@/lib/sharepoint-plan";

const meetingRows: SharePointFields[] = [
  {
    Title: "Full Board Meeting",
    Category: "Board",
    Purpose: "Governance and organizational oversight.",
    Leader: "Board Chair / CEO",
    Attendees: "Full Board",
    Cadence: "Quarterly",
    DayOfWeek: "Tuesday",
    WeekOfMonth: "2nd",
    Modality: "In-person",
    AttendanceRule: "Core required",
    Flexibility: "Fixed — Executive approval required to move",
    RuleStatus: "Needs validation",
    Location: "LSS — location to confirm",
    PreferredTime: "2027-01-01 17:00",
    Duration: 120,
    Notes:
      "Frequency detail: Second Tuesday in January; March; July; September | Default month(s): January; March; July; September | Assumptions: A-BOARD",
  },
  {
    Title: "Executive Team Meeting",
    Category: "Executive",
    Purpose: "Define and manage LSS strategy.",
    Leader: "CEO",
    Attendees: "Executive Team",
    Cadence: "Weekly",
    DayOfWeek: "Monday",
    Modality: "Hybrid",
    AttendanceRule: "Core required",
    Flexibility: "Movable with approval",
    RuleStatus: "Confirmed",
    PreferredTime: "2027-01-01 09:00",
    Duration: 90,
    Notes: "Frequency detail: Every week | Default month(s): All months",
  },
];

const holidayRows: SharePointFields[] = [
  { Title: "New Year's Day", Date: "2027-01-01", Status: "verified_federal" },
  { Title: "Good Friday", Date: "3/26/2027", Status: "projected_lss" },
];

test("normalizes SharePoint meeting rows into scheduler templates", () => {
  const { templates, warnings } = meetingTemplatesFromSharePoint(meetingRows);
  const board = templates.find((template) => template.id === "full-board");

  assert.deepEqual(warnings, []);
  assert.ok(board);
  assert.equal(board.purpose, "Governance and organizational oversight.");
  assert.equal(board.durationMinutes, 120);
  assert.equal(board.startTime, "17:00");
  assert.equal(board.flexibility, "protected");
  assert.deepEqual(board.assumptionIds, ["A-BOARD"]);
  assert.deepEqual(board.generation, {
    type: "nth_weekday",
    months: [1, 3, 7, 9],
    ordinal: 2,
    weekday: 2,
  });
});

test("normalizes SharePoint holiday rows and treats unknown status as projected LSS closure", () => {
  const holidays = holidaysFromSharePoint([
    ...holidayRows,
    { Title: "Day after Thanksgiving", Date: "2027-11-26", Status: "LSS Holidays and Closures" },
  ]);

  assert.deepEqual(holidays, [
    { date: "2027-01-01", name: "New Year's Day", status: "verified_federal" },
    { date: "2027-03-26", name: "Good Friday", status: "projected_lss" },
    { date: "2027-11-26", name: "Day after Thanksgiving", status: "projected_lss" },
  ]);
});

test("builds a calendar plan from SharePoint rows using the supplied holiday set", () => {
  const { plan } = calendarPlanFromSharePoint(meetingRows, holidayRows);
  const executiveHoliday = plan.events.find(
    (event) => event.templateId === "executive-team" && event.originalDate === "2027-02-15",
  );

  assert.equal(plan.label, "2027 Working Draft — SharePoint rules");
  assert.ok(plan.templates);
  assert.equal(plan.holidays.some((holiday) => holiday.date === "2027-02-15"), false);
  assert.ok(executiveHoliday);
  assert.equal(executiveHoliday.date, "2027-02-15");
});

test("maps a confirmed working rule back to the existing SharePoint column choices", () => {
  const template = meetingTemplatesFromSharePoint(meetingRows).templates[0];
  const fields = sharePointRuleFields(template, {
    cadencePreset: "biweekly",
    annualCount: 26,
    weekday: 3,
    ordinal: 4,
    startTime: "16:30",
    durationMinutes: 75,
    location: "Main office",
    modality: "In person",
    attendees: ["Board", "CEO"],
    startMonth: 2,
    minimumLeadDays: 14,
  }, "Frequency detail: Existing source | Default month(s): January; March | Assumptions: A-BOARD");
  assert.deepEqual(fields, {
    Cadence: "Bi-Weekly",
    DayOfWeek: "Wednesday",
    WeekOfMonth: "4th",
    PreferredTime: "2027-01-01 16:30",
    Duration: 75,
    Location: "Main office",
    Modality: "In-person",
    Attendees: "Board; CEO",
    MeetingDependency: "At least 14 calendar days before the related Board decision.",
    Notes: "Frequency detail: Existing source | Default month(s): All months | Assumptions: A-BOARD",
  });

  const created = newSharePointMeetingFields({ ...template, name: "New Governance Group" }, { cadencePreset: "quarterly" });
  assert.equal(created.Title, "New Governance Group");
  assert.equal(created.Cadence, "Quarterly");
  assert.equal(created.RuleStatus, "Needs validation");
});

test("SharePoint API route fails clearly when credentials are absent", async () => {
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  const previous = {
    tenant: process.env.MICROSOFT_TENANT_ID,
    client: process.env.MICROSOFT_CLIENT_ID,
    secret: process.env.MICROSOFT_CLIENT_SECRET,
    msTenant: process.env.MS_TENANT_ID,
    msClient: process.env.MS_CLIENT_ID,
    msSecret: process.env.MS_CLIENT_SECRET,
  };
  delete process.env.MICROSOFT_TENANT_ID;
  delete process.env.MICROSOFT_CLIENT_ID;
  delete process.env.MICROSOFT_CLIENT_SECRET;
  delete process.env.MS_TENANT_ID;
  delete process.env.MS_CLIENT_ID;
  delete process.env.MS_CLIENT_SECRET;

  try {
    const response = await GET();
    const payload = await response.json() as { error?: string; missing?: string[] };

    assert.equal(response.status, 503);
    assert.match(payload.error ?? "", /not configured/i);
    assert.deepEqual(payload.missing, [
      "MICROSOFT_TENANT_ID",
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
    ]);
  } finally {
    restore("MICROSOFT_TENANT_ID", previous.tenant);
    restore("MICROSOFT_CLIENT_ID", previous.client);
    restore("MICROSOFT_CLIENT_SECRET", previous.secret);
    restore("MS_TENANT_ID", previous.msTenant);
    restore("MS_CLIENT_ID", previous.msClient);
    restore("MS_CLIENT_SECRET", previous.msSecret);
  }
});
