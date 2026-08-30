import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "@/app/api/outlook-events/route";
import { POST } from "@/app/api/outlook-publish/route";
import {
  graphEventBody,
  importedEventFromOutlook,
  type OutlookPublishEventInput,
} from "@/lib/outlook-sync";

const publishEvent: OutlookPublishEventInput = {
  id: "full-board-2027-01-13-1",
  title: "Full Board Meeting",
  message: "Provide recurring governance discussion and decisions.",
  date: "2027-01-13",
  startTime: "17:00",
  durationMinutes: 120,
  location: "LSS",
  attendees: ["Full Board"],
  distributionLists: ["board@example.org"],
  category: "board",
};

function clearMicrosoftEnv(): Record<string, string | undefined> {
  const previous: Record<string, string | undefined> = {};
  for (const name of [
    "MICROSOFT_TENANT_ID",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "MS_TENANT_ID",
    "MS_CLIENT_ID",
    "MS_CLIENT_SECRET",
    "OUTLOOK_TARGET_USER",
    "MICROSOFT_OUTLOOK_USER",
    "OUTLOOK_PUBLISH_ENABLED",
  ]) {
    previous[name] = process.env[name];
    delete process.env[name];
  }
  return previous;
}

function restoreEnv(previous: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

test("maps Microsoft Graph calendar events into imported Outlook context", () => {
  const imported = importedEventFromOutlook({
    id: "graph-event-1",
    iCalUId: "ical-1",
    subject: "Existing Finance Committee",
    start: { dateTime: "2027-03-22T10:00:00", timeZone: "Eastern Standard Time" },
    end: { dateTime: "2027-03-22T11:30:00", timeZone: "Eastern Standard Time" },
    location: { displayName: "Teams" },
    organizer: { emailAddress: { name: "Felise", address: "felise@example.org" } },
    attendees: [{ emailAddress: { address: "finance@example.org" } }],
    bodyPreview: "Existing calendar hold",
  });

  assert.ok(imported);
  assert.equal(imported.title, "Existing Finance Committee");
  assert.equal(imported.date, "2027-03-22");
  assert.equal(imported.startTime, "10:00");
  assert.equal(imported.endTime, "11:30");
  assert.equal(imported.durationMinutes, 90);
  assert.equal(imported.original, "outlook_snapshot");
});

test("builds a Microsoft Graph create-event body from an approved planner event", () => {
  const body = graphEventBody(publishEvent, "Eastern Standard Time");

  assert.equal(body.subject, "Full Board Meeting");
  assert.equal(body.start.dateTime, "2027-01-13T17:00:00");
  assert.equal(body.end.dateTime, "2027-01-13T19:00:00");
  assert.equal(body.start.timeZone, "Eastern Standard Time");
  assert.deepEqual(body.attendees?.map((item) => item.emailAddress.address), ["board@example.org"]);
  assert.equal(body.transactionId, "lss-2027-full-board-2027-01-13-1");
});

test("Outlook read route fails clearly when credentials are absent", async () => {
  const previous = clearMicrosoftEnv();
  try {
    const response = await GET();
    const payload = await response.json() as { error?: string; missing?: string[] };

    assert.equal(response.status, 503);
    assert.match(payload.error ?? "", /not configured/i);
    assert.deepEqual(payload.missing, [
      "MICROSOFT_TENANT_ID",
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
      "OUTLOOK_TARGET_USER",
    ]);
  } finally {
    restoreEnv(previous);
  }
});

test("Outlook publish route requires explicit confirmation", async () => {
  const previous = clearMicrosoftEnv();
  process.env.MICROSOFT_TENANT_ID = "tenant";
  process.env.MICROSOFT_CLIENT_ID = "client";
  process.env.MICROSOFT_CLIENT_SECRET = "secret";
  process.env.OUTLOOK_TARGET_USER = "felise@example.org";
  try {
    const response = await POST(new Request("http://localhost/api/outlook-publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [publishEvent] }),
    }));
    const payload = await response.json() as { error?: string };

    assert.equal(response.status, 400);
    assert.match(payload.error ?? "", /explicit confirmation/i);
  } finally {
    restoreEnv(previous);
  }
});

test("Outlook publish stays disabled unless the demo write switch is explicit", async () => {
  const previous = clearMicrosoftEnv();
  process.env.MICROSOFT_TENANT_ID = "tenant";
  process.env.MICROSOFT_CLIENT_ID = "client";
  process.env.MICROSOFT_CLIENT_SECRET = "secret";
  process.env.OUTLOOK_TARGET_USER = "demo@example.org";
  try {
    const response = await POST(new Request("http://localhost/api/outlook-publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true, events: [publishEvent] }),
    }));
    const payload = await response.json() as { error?: string };

    assert.equal(response.status, 403);
    assert.match(payload.error ?? "", /publishing is disabled/i);
  } finally {
    restoreEnv(previous);
  }
});
