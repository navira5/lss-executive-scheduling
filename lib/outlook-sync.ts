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

export function importedEventFromOutlook(
  event: OutlookEventFields,
  sourceLabel = "Live Outlook",
): ImportedCalendarEvent | null {
  const startDate = datePart(event.start?.dateTime);
  if (!startDate.startsWith("2027-")) return null;
  const isAllDay = event.isAllDay === true;
  return {
    id: `outlook-live-${event.id ?? event.iCalUId ?? startDate}`,
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
