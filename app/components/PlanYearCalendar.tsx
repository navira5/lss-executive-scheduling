"use client";

import { useState } from "react";

import type { ImportedCalendarEvent } from "@/lib/calendar-import";
import {
  isEventLocked,
  resolvePlanEvent,
  visiblePlanEvents,
  type PlanYearState,
  type ResolvedPlanEvent,
} from "@/lib/plan-year";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function dateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function daysInMonth(monthIndex: number): number {
  return new Date(Date.UTC(2027, monthIndex + 1, 0)).getUTCDate();
}

function firstWeekday(monthIndex: number): number {
  return new Date(Date.UTC(2027, monthIndex, 1)).getUTCDay();
}

interface MonthCardProps {
  monthIndex: number;
  events: ResolvedPlanEvent[];
  importedEvents: ImportedCalendarEvent[];
  state: PlanYearState;
  draggingEventId: string | null;
  moveModeEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onSelectImported: (eventId: string) => void;
  onMoveEvent: (eventId: string, date: string) => void;
  onDragStateChange: (eventId: string | null) => void;
  onFinishMoveMode: () => void;
}

function MonthCard({
  monthIndex,
  events,
  importedEvents,
  state,
  draggingEventId,
  moveModeEventId,
  onSelectEvent,
  onSelectImported,
  onMoveEvent,
  onDragStateChange,
  onFinishMoveMode,
}: MonthCardProps) {
  const start = firstWeekday(monthIndex);
  const count = daysInMonth(monthIndex);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - start + 1;
    return day >= 1 && day <= count ? day : null;
  });
  const realEvents = events.filter((event) => !event.isPlaceholder);
  const placeholders = events.filter((event) => event.isPlaceholder);
  const holidays = state.plan.holidays.filter(
    (holiday) => dateParts(holiday.date).month === monthIndex + 1,
  );

  return (
    <section className="month-card" aria-label={`${MONTHS[monthIndex]} 2027`}>
      <header className="month-header">
        <h3>{MONTHS[monthIndex]}</h3>
        <span>{realEvents.length + importedEvents.length} meetings</span>
      </header>
      {placeholders.length > 0 && (
        <div className="tbd-strip">
          <strong>TBD</strong>
          {placeholders.map((event) => (
            <button key={event.id} type="button" onClick={() => onSelectEvent(event.id)}>
              {event.abbreviation}
            </button>
          ))}
        </div>
      )}
      <div className="weekday-row" aria-hidden="true">
        {WEEKDAYS.map((weekday, index) => (
          <span key={`${weekday}-${index}`}>{weekday}</span>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((day, index) => {
          if (!day) return <div className="day-cell outside" key={`${monthIndex}-${index}`} />;
          const isoDate = `2027-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = realEvents.filter((event) => event.date === isoDate);
          const dayImported = importedEvents.filter((event) => event.date === isoDate);
          const holiday = holidays.find((item) => item.date === isoDate);
          return (
            <div
              className={`day-cell${holiday ? " holiday" : ""}${draggingEventId || moveModeEventId ? holiday ? " drop-blocked" : " drop-ready" : ""}`}
              key={isoDate}
              data-calendar-date={isoDate}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const eventId =
                  event.dataTransfer.getData("text/lss-event-id") ||
                  event.dataTransfer.getData("text/plain") ||
                  draggingEventId;
                if (eventId) onMoveEvent(eventId, isoDate);
                onDragStateChange(null);
              }}
              onClick={() => {
                if (!moveModeEventId) return;
                onMoveEvent(moveModeEventId, isoDate);
                onFinishMoveMode();
              }}
            >
              <span className="day-number">{day}</span>
              {holiday && (
                <span
                  className={`holiday-marker ${holiday.status}`}
                  title={`${holiday.name} — no meetings`}
                >
                  {holiday.status === "verified_federal" ? "Holiday" : "LSS?"}
                </span>
              )}
              <div className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    type="button"
                    className={`event-chip ${event.category} status-${event.status}${event.locked ? " locked" : ""}`}
                    key={event.id}
                    draggable={!isEventLocked(state, event)}
                    onDragStart={(dragEvent) => {
                      dragEvent.dataTransfer.setData("text/lss-event-id", event.id);
                      dragEvent.dataTransfer.setData("text/plain", event.id);
                      dragEvent.dataTransfer.effectAllowed = "move";
                      onDragStateChange(event.id);
                    }}
                    onDragEnd={() => onDragStateChange(null)}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onSelectEvent(event.id);
                    }}
                    title={`${event.title}${event.locked ? " — confirmed anchor" : " — drag or click to adjust"}`}
                  >
                    {event.abbreviation}
                  </button>
                ))}
                {dayImported.slice(0, 2).map((event) => (
                  <button
                    type="button"
                    className="event-chip outlook"
                    key={event.id}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onSelectImported(event.id);
                    }}
                    title={`${event.title} — imported from ${event.sourceLabel}`}
                  >
                    OUT
                  </button>
                ))}
                {dayEvents.length + dayImported.length > 5 && (
                  <span className="more-events">+{dayEvents.length + dayImported.length - 5}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface PlanYearCalendarProps {
  state: PlanYearState;
  importedEvents: ImportedCalendarEvent[];
  selectedEventId: string | null;
  moveNotice: { valid: boolean; message: string } | null;
  onSelectEvent: (eventId: string) => void;
  onSelectImported: (eventId: string) => void;
  onMoveEvent: (eventId: string, date: string) => void;
}

export function PlanYearCalendar({
  state,
  importedEvents,
  selectedEventId,
  moveNotice,
  onSelectEvent,
  onSelectImported,
  onMoveEvent,
}: PlanYearCalendarProps) {
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [moveModeEventId, setMoveModeEventId] = useState<string | null>(null);
  const events = visiblePlanEvents(state).map((event) =>
    resolvePlanEvent(state, event.id),
  );
  const selectedEvent = selectedEventId
    ? events.find((event) => event.id === selectedEventId) ?? null
    : null;
  const selectedCanMove = selectedEvent && !isEventLocked(state, selectedEvent);
  return (
    <section className="calendar-section" aria-labelledby="calendar-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Year at a glance</p>
          <h2 id="calendar-heading">January–December 2027</h2>
          <p>Only confirmed layers and the meeting group you are planning now are shown.</p>
        </div>
        <div className="calendar-legend" aria-label="Calendar legend">
          <span><i className="legend-dot board" />Board</span>
          <span><i className="legend-dot committee" />Committee</span>
          <span><i className="legend-dot executive" />Executive</span>
          <span><i className="legend-dot organization" />Organization</span>
          <span><i className="legend-dot outlook" />Existing Outlook</span>
        </div>
      </div>
      <div
        className={`calendar-move-bar${moveNotice && !moveNotice.valid ? " invalid" : ""}`}
        aria-live="polite"
      >
        <span>
          {moveModeEventId
            ? "Choose a destination day on the calendar."
            : moveNotice?.message ?? "Drag an active meeting to another day."}
        </span>
        {selectedCanMove && (
          <button
            type="button"
            className={moveModeEventId ? "active" : ""}
            onClick={() => setMoveModeEventId((current) => current ? null : selectedEvent.id)}
          >
            {moveModeEventId ? "Cancel move" : `Move selected: ${selectedEvent.abbreviation}`}
          </button>
        )}
      </div>
      <div className="year-scroll">
        <div className="year-grid">
          {MONTHS.map((_, monthIndex) => (
            <MonthCard
              key={monthIndex}
              monthIndex={monthIndex}
              events={events.filter(
                (event) => dateParts(event.date).month === monthIndex + 1,
              )}
              importedEvents={importedEvents.filter(
                (event) => dateParts(event.date).month === monthIndex + 1,
              )}
              state={state}
              draggingEventId={draggingEventId}
              moveModeEventId={moveModeEventId}
              onSelectEvent={onSelectEvent}
              onSelectImported={onSelectImported}
              onMoveEvent={onMoveEvent}
              onDragStateChange={setDraggingEventId}
              onFinishMoveMode={() => setMoveModeEventId(null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
