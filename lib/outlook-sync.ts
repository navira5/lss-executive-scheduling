import type { ImportedCalendarEvent } from "@/lib/calendar-import";
import type { ResolvedPlanEvent } from "@/lib/plan-year";

export interface OutlookEventFields {
  id?: string;
  iCalUId?: string;
  subject?: string;
  isAllDay?: boolean;
  start?: {
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    timeZone?: string;
  };
  location?: {
    displayName?: string;
  };
  organizer?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  attendees?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  }[];
  bodyPreview?: string;
  body?: {
    contentType?: string;
    content?: string;
  };
  recurrence?: unknown;
}

export interface OutlookPublishEventInput {
  id: string;
  title: string;
  message: string;
  date: string;
  startTime: string | null;
  durationMinutes: number;
  location: string;
  attendees: string[];
  distributionLists: string[];
  category: string;
}

export interface OutlookPublishPayload {
  events?: OutlookPublishEventInput[];
  confirm?: boolean;
}

export interface OutlookSyncRequest {
  events?: OutlookPublishEventInput[];
  cancelledPlannerEventIds?: string[];
  deleteOutlookEventIds?: string[];
  confirm?: boolean;
}

export type OutlookSyncAction = "create" | "update" | "delete";

export interface OutlookSyncChange {
  action: OutlookSyncAction;
  title: string;
  date: string;
  plannerEventId?: string;
  outlookEventId?: string;
  detail: string;
}

export interface OutlookSyncPreview {
  changes: OutlookSyncChange[];
  unchanged: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
}

export interface GraphCalendarEventBody {
  subject: string;
  body: {
    contentType: "HTML";
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: {
    emailAddress: {
      address: string;
      name?: string;
    };
    type: "required";
  }[];
  categories?: string[];
  transactionId: string;
}

function datePart(value: string | undefined): string {
  return value?.slice(0, 10) ?? "";
}

function timePart(value: string | undefined): string | null {
  if (!value || value.length < 16) return null;
  return value.slice(11, 16);
}

function minutesBetween(start: string | undefined, end: string | undefined): number {
  const startValue = start ? new Date(start) : null;
  const endValue = end ? new Date(end) : null;
  if (!startValue || !endValue || Number.isNaN(startValue.valueOf()) || Number.isNaN(endValue.valueOf())) {
    return 0;
  }
  return Math.max(0, Math.round((endValue.getTime() - startValue.getTime()) / 60_000));
}

function addMinutes(date: string, time: string, durationMinutes: number): { date: string; time: string } {
  const [hour, minute] = time.split(":").map(Number);
  const start = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hour, minute));
  start.setUTCMinutes(start.getUTCMinutes() + durationMinutes);
  return {
    date: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`,
    time: `${String(start.getUTCHours()).padStart(2, "0")}:${String(start.getUTCMinutes()).padStart(2, "0")}`,
  };
}

function textToHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>");
}

function emailAddress(value: string): string | null {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? null;
}

export function plannerEventIdFromOutlook(event: OutlookEventFields): string | undefined {
  const content = event.body?.content ?? event.bodyPreview ?? "";
  const match = content.match(/LSS planning event ID:\s*([^<\s]+)/i);
  return match?.[1]?.trim();
}

export function importedEventFromOutlook(
  event: OutlookEventFields,
  sourceLabel = "Live Outlook",
): ImportedCalendarEvent | null {
  const startDate = datePart(event.start?.dateTime);
  if (!startDate.startsWith("2027-")) return null;
  const isAllDay = event.isAllDay === true;
  return {
    id: `outlook-live-${event.id ?? event.iCalUId ?? startDate}`,
    outlookEventId: event.id,
    plannerEventId: plannerEventIdFromOutlook(event),
    sourceLabel,
    sourceUid: event.iCalUId ?? event.id ?? `missing-uid-${startDate}`,
    title: event.subject ?? "Untitled Outlook event",
    date: startDate,
    startTime: isAllDay ? null : timePart(event.start?.dateTime),
    endTime: isAllDay ? null : timePart(event.end?.dateTime),
    durationMinutes: isAllDay ? 1440 : minutesBetween(event.start?.dateTime, event.end?.dateTime),
    location: event.location?.displayName || undefined,
    organizer: event.organizer?.emailAddress?.name ?? event.organizer?.emailAddress?.address,
    attendees: event.attendees
      ?.map((attendee) => attendee.emailAddress?.name ?? attendee.emailAddress?.address ?? "")
      .filter(Boolean),
    description: event.bodyPreview,
    recurrence: event.recurrence ? "recurring" : undefined,
    original: "outlook_snapshot",
  };
}

export function toOutlookPublishInput(event: ResolvedPlanEvent): OutlookPublishEventInput {
  return {
    id: event.id,
    title: event.title,
    message: event.message,
    date: event.date,
    startTime: event.startTime,
    durationMinutes: event.durationMinutes,
    location: event.location,
    attendees: event.attendees,
    distributionLists: event.distributionLists,
    category: event.category,
  };
}

export function graphEventBody(
  event: OutlookPublishEventInput,
  timeZone: string,
): GraphCalendarEventBody {
  const startTime = event.startTime ?? "09:00";
  const end = addMinutes(event.date, startTime, event.durationMinutes || 60);
  const recipientAddresses = [...event.distributionLists, ...event.attendees]
    .map(emailAddress)
    .filter((address): address is string => Boolean(address));
  const uniqueRecipients = [...new Set(recipientAddresses)];
  return {
    subject: event.title,
    body: {
      contentType: "HTML",
      content: textToHtml([
        event.message,
        "",
        `LSS planning event ID: ${event.id}`,
        "Generated from the LSS 2027 scheduling planner after human approval.",
      ].join("\n")),
    },
    start: {
      dateTime: `${event.date}T${startTime}:00`,
      timeZone,
    },
    end: {
      dateTime: `${end.date}T${end.time}:00`,
      timeZone,
    },
    ...(event.location ? { location: { displayName: event.location } } : {}),
    ...(uniqueRecipients.length
      ? {
          attendees: uniqueRecipients.map((address) => ({
            emailAddress: { address },
            type: "required" as const,
          })),
        }
      : {}),
    categories: ["LSS 2027 Planning", event.category],
    transactionId: `lss-2027-${event.id}`.slice(0, 150),
  };
}

export function graphEventPatchBody(
  event: OutlookPublishEventInput,
  timeZone: string,
): Omit<GraphCalendarEventBody, "transactionId"> {
  const body = graphEventBody(event, timeZone);
  return {
    subject: body.subject,
    body: body.body,
    start: body.start,
    end: body.end,
    ...(body.location ? { location: body.location } : {}),
    ...(body.attendees ? { attendees: body.attendees } : {}),
    ...(body.categories ? { categories: body.categories } : {}),
  };
}

function comparablePlannerEvent(event: OutlookPublishEventInput) {
  return {
    title: event.title.trim(),
    date: event.date,
    startTime: event.startTime ?? "09:00",
    durationMinutes: event.durationMinutes || 60,
    location: event.location.trim(),
  };
}

function comparableOutlookEvent(event: OutlookEventFields) {
  return {
    title: (event.subject ?? "").trim(),
    date: datePart(event.start?.dateTime),
    startTime: event.isAllDay ? "09:00" : (timePart(event.start?.dateTime) ?? "09:00"),
    durationMinutes: event.isAllDay ? 1440 : minutesBetween(event.start?.dateTime, event.end?.dateTime),
    location: (event.location?.displayName ?? "").trim(),
  };
}

function sameComparable(left: ReturnType<typeof comparablePlannerEvent>, right: ReturnType<typeof comparableOutlookEvent>): boolean {
  return left.title === right.title &&
    left.date === right.date &&
    left.startTime === right.startTime &&
    left.durationMinutes === right.durationMinutes &&
    left.location === right.location;
}

export function buildOutlookSyncPreview(
  desiredEvents: OutlookPublishEventInput[],
  existingEvents: OutlookEventFields[],
  cancelledPlannerEventIds: string[] = [],
  deleteOutlookEventIds: string[] = [],
): OutlookSyncPreview {
  const existingByPlannerId = new Map<string, OutlookEventFields>();
  const existingByOutlookId = new Map<string, OutlookEventFields>();
  for (const event of existingEvents) {
    if (event.id) existingByOutlookId.set(event.id, event);
    const plannerId = plannerEventIdFromOutlook(event);
    if (plannerId) existingByPlannerId.set(plannerId, event);
  }

  const changes: OutlookSyncChange[] = [];
  let unchanged = 0;
  for (const desired of desiredEvents) {
    const existing = existingByPlannerId.get(desired.id);
    if (!existing) {
      changes.push({
        action: "create",
        plannerEventId: desired.id,
        title: desired.title,
        date: desired.date,
        detail: "Create this confirmed planner meeting in the demo Outlook calendar.",
      });
      continue;
    }
    if (sameComparable(comparablePlannerEvent(desired), comparableOutlookEvent(existing))) {
      unchanged += 1;
      continue;
    }
    changes.push({
      action: "update",
      plannerEventId: desired.id,
      outlookEventId: existing.id,
      title: desired.title,
      date: desired.date,
      detail: "Update the existing planner-managed Outlook event to match this approved placement.",
    });
  }

  const deletionIds = new Set(deleteOutlookEventIds);
  for (const plannerId of cancelledPlannerEventIds) {
    const existing = existingByPlannerId.get(plannerId);
    if (existing?.id) deletionIds.add(existing.id);
  }
  for (const outlookId of deletionIds) {
    const existing = existingByOutlookId.get(outlookId);
    if (!existing) continue;
    changes.push({
      action: "delete",
      plannerEventId: plannerEventIdFromOutlook(existing),
      outlookEventId: outlookId,
      title: existing.subject ?? "Untitled Outlook event",
      date: datePart(existing.start?.dateTime),
      detail: "Delete this event from the dedicated demo Outlook calendar after confirmation.",
    });
  }

  changes.sort((left, right) => `${left.date}-${left.action}-${left.title}`.localeCompare(`${right.date}-${right.action}-${right.title}`));
  return {
    changes,
    unchanged,
    createCount: changes.filter((change) => change.action === "create").length,
    updateCount: changes.filter((change) => change.action === "update").length,
    deleteCount: changes.filter((change) => change.action === "delete").length,
  };
}
