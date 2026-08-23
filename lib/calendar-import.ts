import ICAL from "ical.js";

const DISPLAY_TIME_ZONE = "America/New_York";
const RANGE_END = new Date("2028-01-02T00:00:00.000Z");

export interface ImportedCalendarEvent {
  id: string;
  sourceLabel: string;
  sourceUid: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  location?: string;
  organizer?: string;
  attendees?: string[];
  description?: string;
  recurrence?: string;
  original: "outlook_snapshot";
}

export interface SkippedCalendarRecord {
  sourceLabel: string;
  title?: string;
  reason: string;
}

export interface CalendarImportResult {
  events: ImportedCalendarEvent[];
  skipped: SkippedCalendarRecord[];
}

export interface AgentImportedEventContext {
  id: string;
  sourceLabel: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  location?: string;
}

function dateParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: DISPLAY_TIME_ZONE,
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function formatDate(date: Date): string {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatTime(date: Date): string {
  const parts = dateParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function propertyText(
  component: InstanceType<typeof ICAL.Component>,
  name: string,
): string | undefined {
  const value = component.getFirstPropertyValue(name);
  if (value === null || value === undefined) return undefined;
  return String(value);
}

function attendeeLabels(component: InstanceType<typeof ICAL.Component>): string[] {
  return component.getAllProperties("attendee").map((property) => {
    const commonName = property.getFirstParameter("cn");
    const value = property.getFirstValue();
    return commonName || String(value ?? "").replace(/^mailto:/i, "");
  }).filter(Boolean);
}

function organizerLabel(component: InstanceType<typeof ICAL.Component>): string | undefined {
  const property = component.getFirstProperty("organizer");
  if (!property) return undefined;
  return (
    property.getFirstParameter("cn") ||
    String(property.getFirstValue() ?? "").replace(/^mailto:/i, "") ||
    undefined
  );
}

function eventRecord(
  event: InstanceType<typeof ICAL.Event>,
  component: InstanceType<typeof ICAL.Component>,
  sourceLabel: string,
  start: InstanceType<typeof ICAL.Time>,
  end: InstanceType<typeof ICAL.Time>,
  occurrenceIndex: number,
): ImportedCalendarEvent | null {
  const startDate = start.toJSDate();
  const endDate = end.toJSDate();
  const localDate = formatDate(startDate);
  if (!localDate.startsWith("2027-")) return null;
  const isAllDay = start.isDate;
  const recurrenceProperty = component.getFirstProperty("rrule");
  return {
    id: `outlook-${event.uid || "event"}-${localDate}-${occurrenceIndex}`,
    sourceLabel,
    sourceUid: event.uid || `missing-uid-${occurrenceIndex}`,
    title: event.summary || "Untitled Outlook event",
    date: localDate,
    startTime: isAllDay ? null : formatTime(startDate),
    endTime: isAllDay ? null : formatTime(endDate),
    durationMinutes: minutesBetween(startDate, endDate),
    location: event.location || undefined,
    organizer: organizerLabel(component),
    attendees: attendeeLabels(component),
    description: event.description || undefined,
    recurrence: recurrenceProperty?.toICALString(),
    original: "outlook_snapshot",
  };
}

function recordsForEvent(
  component: InstanceType<typeof ICAL.Component>,
  sourceLabel: string,
): ImportedCalendarEvent[] {
  const event = new ICAL.Event(component);
  if (event.isRecurrenceException()) return [];
  if (!event.isRecurring()) {
    const record = eventRecord(
      event,
      component,
      sourceLabel,
      event.startDate,
      event.endDate,
      0,
    );
    return record ? [record] : [];
  }

  const iterator = event.iterator();
  const records: ImportedCalendarEvent[] = [];
  for (let index = 0; index < 5000; index += 1) {
    const occurrence = iterator.next();
    if (!occurrence) break;
    const details = event.getOccurrenceDetails(occurrence);
    if (details.startDate.toJSDate() >= RANGE_END) break;
    const record = eventRecord(
      details.item,
      details.item.component,
      sourceLabel,
      details.startDate,
      details.endDate,
      index,
    );
    if (record) records.push(record);
  }
  return records;
}

export function parseCalendarSnapshot(
  contents: string,
  sourceLabel: string,
): CalendarImportResult {
  try {
    const parsed = ICAL.parse(contents);
    const calendar = new ICAL.Component(parsed);
    if (calendar.name !== "vcalendar") throw new Error("Not a VCALENDAR component");
    const components = calendar.getAllSubcomponents("vevent");
    if (components.length === 0) {
      return {
        events: [],
        skipped: [{ sourceLabel, reason: "The calendar contained no meeting events." }],
      };
    }
    const events: ImportedCalendarEvent[] = [];
    const skipped: SkippedCalendarRecord[] = [];
    for (const component of components) {
      try {
        events.push(...recordsForEvent(component, sourceLabel));
      } catch (error) {
        skipped.push({
          sourceLabel,
          title: propertyText(component, "summary"),
          reason: error instanceof Error ? error.message : "The event could not be parsed.",
        });
      }
    }
    return {
      events: events.sort((left, right) =>
        `${left.date}T${left.startTime ?? "00:00"}`.localeCompare(
          `${right.date}T${right.startTime ?? "00:00"}`,
        ),
      ),
      skipped,
    };
  } catch {
    return {
      events: [],
      skipped: [{ sourceLabel, reason: "The iCalendar file could not be parsed." }],
    };
  }
}

export function toAgentImportedContext(
  event: ImportedCalendarEvent,
): AgentImportedEventContext {
  return {
    id: event.id,
    sourceLabel: event.sourceLabel,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    durationMinutes: event.durationMinutes,
    location: event.location,
  };
}
