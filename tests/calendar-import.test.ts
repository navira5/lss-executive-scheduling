import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCalendarSnapshot,
  toAgentImportedContext,
} from "@/lib/calendar-import";

const singleEventIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LSS Test//Calendar Snapshot//EN
BEGIN:VEVENT
UID:donor-1@example.com
DTSTAMP:20260822T120000Z
DTSTART:20270309T190000Z
DTEND:20270309T203000Z
SUMMARY:Existing donor meeting
LOCATION:Downtown Columbus
DESCRIPTION:Confidential donor background must remain local.
ORGANIZER;CN=Rachel Example:mailto:rachel@example.com
ATTENDEE;CN=Navira Example:mailto:navira@example.com
END:VEVENT
END:VCALENDAR`;

const recurringIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LSS Test//Calendar Snapshot//EN
BEGIN:VEVENT
UID:weekly-1@example.com
DTSTAMP:20260822T120000Z
DTSTART:20270104T140000Z
DTEND:20270104T150000Z
RRULE:FREQ=WEEKLY;COUNT=4
SUMMARY:Existing weekly operations meeting
END:VEVENT
END:VCALENDAR`;

test("imports the required Outlook snapshot context", () => {
  const result = parseCalendarSnapshot(singleEventIcs, "Rachel");

  assert.equal(result.skipped.length, 0);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].title, "Existing donor meeting");
  assert.equal(result.events[0].date, "2027-03-09");
  assert.equal(result.events[0].startTime, "14:00");
  assert.equal(result.events[0].endTime, "15:30");
  assert.equal(result.events[0].durationMinutes, 90);
  assert.equal(result.events[0].sourceLabel, "Rachel");
  assert.equal(result.events[0].location, "Downtown Columbus");
});

test("expands recurring meetings that occur during 2027", () => {
  const result = parseCalendarSnapshot(recurringIcs, "Organization");

  assert.equal(result.skipped.length, 0);
  assert.deepEqual(
    result.events.map((event) => event.date),
    ["2027-01-04", "2027-01-11", "2027-01-18", "2027-01-25"],
  );
  assert.ok(result.events.every((event) => event.startTime === "09:00"));
  assert.ok(result.events.every((event) => event.durationMinutes === 60));
});

test("keeps descriptions local when producing model context", () => {
  const imported = parseCalendarSnapshot(singleEventIcs, "Rachel").events[0];
  const context = toAgentImportedContext(imported);

  assert.equal(context.title, "Existing donor meeting");
  assert.equal(context.date, "2027-03-09");
  assert.ok(!("description" in context));
  assert.ok(!("attendees" in context));
  assert.doesNotMatch(JSON.stringify(context), /Confidential donor background/);
});

test("reports an invalid calendar instead of hiding the failure", () => {
  const result = parseCalendarSnapshot("not an iCalendar file", "Broken import");

  assert.equal(result.events.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.match(result.skipped[0].reason, /could not be parsed/i);
});
