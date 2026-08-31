import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "@/app/api/outlook-events/route";
import { POST } from "@/app/api/outlook-publish/route";
import {
  buildOutlookSyncPreview,
  graphEventBody,
  importedEventFromOutlook,
  type OutlookPublishEventInput,
} from "@/lib/outlook-sync";
import {
  microsoftGraphFailureResponse,
  microsoftGraphRequestError,
} from "@/lib/microsoft-graph-error";

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

test("previews creates, updates, deletes, and unchanged Outlook events without touching unrelated meetings", () => {
  const matching = {
    id: "outlook-matching",
    subject: publishEvent.title,
    start: { dateTime: `${publishEvent.date}T${publishEvent.startTime}:00` },
    end: { dateTime: "2027-01-13T19:00:00" },
    location: { displayName: publishEvent.location },
    body: { content: `LSS planning event ID: ${publishEvent.id}` },
  };
  const changed = {
    id: "outlook-changed",
    subject: "Old title",
    start: { dateTime: "2027-03-01T09:00:00" },
    end: { dateTime: "2027-03-01T10:00:00" },
    location: { displayName: "Old room" },
    body: { content: "LSS planning event ID: plan-update" },
  };
  const deleted = {
    id: "outlook-delete",
    subject: "Cancelled hold",
    start: { dateTime: "2027-04-01T09:00:00" },
    end: { dateTime: "2027-04-01T10:00:00" },
    body: { content: "LSS planning event ID: plan-delete" },
  };
  const unrelated = {
    id: "outlook-unrelated",
    subject: "Mayor meeting",
    start: { dateTime: "2027-05-01T09:00:00" },
    end: { dateTime: "2027-05-01T10:00:00" },
  };
  const preview = buildOutlookSyncPreview([
    publishEvent,
    { ...publishEvent, id: "plan-update", title: "Updated title", date: "2027-03-02" },
    { ...publishEvent, id: "plan-create", title: "New planner meeting", date: "2027-06-01" },
  ], [matching, changed, deleted, unrelated], ["plan-delete"]);

  assert.equal(preview.unchanged, 1);
  assert.equal(preview.createCount, 1);
  assert.equal(preview.updateCount, 1);
  assert.equal(preview.deleteCount, 1);
  assert.ok(!preview.changes.some((change) => change.outlookEventId === "outlook-unrelated"));
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

test("legacy direct Outlook publishing is retired in favor of reviewed synchronization", async () => {
  const previous = clearMicrosoftEnv();
  try {
    const response = await POST();
    const payload = await response.json() as { error?: string };

    assert.equal(response.status, 410);
    assert.match(payload.error ?? "", /change review/i);
  } finally {
    restoreEnv(previous);
  }
});

test("turns a Microsoft calendar outage into a safe, traceable retry message", async () => {
  const graphResponse = Response.json({
    error: {
      code: "ErrorInternalServerError",
      message: "An internal server error occurred. The operation failed.",
    },
  }, {
    status: 500,
    headers: { "request-id": "graph-request-123" },
  });

  const error = await microsoftGraphRequestError(graphResponse, "read");
  const failure = microsoftGraphFailureResponse(error, "Outlook calendar import failed.");

  assert.equal(failure.status, 503);
  assert.equal(failure.body.provider, "Microsoft Graph");
  assert.equal(failure.body.providerStatus, 500);
  assert.equal(failure.body.providerCode, "ErrorInternalServerError");
  assert.equal(failure.body.requestId, "graph-request-123");
  assert.equal(failure.body.retryable, true);
  assert.match(String(failure.body.error), /temporarily unavailable/i);
  assert.match(String(failure.body.error), /no Outlook changes were made/i);
  assert.doesNotMatch(String(failure.body.error), /internal server error/i);
});
