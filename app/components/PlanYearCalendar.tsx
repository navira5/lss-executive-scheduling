"use client";

import { useState } from "react";

import type { ImportedCalendarEvent } from "@/lib/calendar-import";
import {
  isEventConfirmed,
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

const CALENDAR_LABELS: Record<string, string> = {
  "full-board": "BOARD",
  "board-retreat": "RETREAT",
  "critical-checkin": "CHECK-IN",
  "executive-committee": "EXEC CMTE",
  "finance-committee": "FINANCE",
  "health-programs": "PROGRAMS",
  "talent-risk": "TALENT/RISK",
  "nominations-committee": "NOMINATIONS",
  "program-committee": "PROGRAM CMTE",
  "board-orientation": "ORIENT",
  "executive-team": "EXEC TEAM",
  "executive-retreat": "EXEC RETREAT",
  "leadership-team": "LEADERSHIP",
  "leadership-retreat": "LEAD RETREAT",
  "all-staff": "ALL STAFF",
  "program-briefing": "PROGRAM BRIEF",
  "supervisory-team": "SUPERVISORS",
  operations: "OPERATIONS",
  bvr: "BVR",
  "internal-risk": "RISK",
};

function committeeToneClass(templateId: string): string {
  const known: Record<string, string> = {
    "executive-committee": "committee-executive-committee",
    "finance-committee": "committee-finance-committee",
    "health-programs": "committee-health-programs",
    "talent-risk": "committee-talent-risk",
    "nominations-committee": "committee-nominations-committee",
    "program-committee": "committee-program-committee",
  };
  if (known[templateId]) return known[templateId];
  const tone = [...templateId].reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
  return `committee-custom-${tone + 1}`;
}

export interface PendingCalendarMove {
  eventId: string;
  targetDate: string;
}

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
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onSelectImported: (eventId: string) => void;
  onMoveEvent: (eventId: string, date: string) => void;
  onDragStateChange: (eventId: string | null) => void;
  onFinishMoveMode: () => void;
  onHoverEvent: (
    detail: { title: string; date: string; x: number; y: number; note?: string } | null,
  ) => void;
  pendingMove: PendingCalendarMove | null;
  onResolveMove: (choice: "rule" | "override") => void;
  onCancelMove: () => void;
  onCloseDate: (date: string, label: string) => void;
  onRemoveClosure: (date: string) => void;
  onAddAdHoc: (date: string, title: string) => void;
}

function MonthCard({
  monthIndex,
  events,
  importedEvents,
  state,
  draggingEventId,
  moveModeEventId,
  selectedEventId,
  onSelectEvent,
  onSelectImported,
  onMoveEvent,
  onDragStateChange,
  onFinishMoveMode,
  onHoverEvent,
  pendingMove,
  onResolveMove,
  onCancelMove,
  onCloseDate,
  onRemoveClosure,
  onAddAdHoc,
}: MonthCardProps) {
  const [dayAction, setDayAction] = useState<{ date: string; mode: "choose" | "closure" | "event"; value: string } | null>(null);
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
          const closure = state.calendarClosures.find((item) => item.date === isoDate);
          return (
            <div
              className={`day-cell${holiday ? " holiday" : ""}${closure ? " closure" : ""}${draggingEventId || moveModeEventId ? holiday || closure ? " drop-blocked" : " drop-ready" : ""}`}
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
                if (moveModeEventId) {
                  onMoveEvent(moveModeEventId, isoDate);
                  onFinishMoveMode();
                  return;
                }
                setDayAction((current) => current?.date === isoDate ? null : { date: isoDate, mode: "choose", value: "" });
              }}
            >
              <span className="day-number">{day}</span>
              {holiday && (
                <span
                  className={`holiday-marker ${holiday.status}`}
                  title={`${holiday.name} — no meetings`}
                >
                  {holiday.name}
                </span>
              )}
              {closure && <span className="closure-marker" title={`${closure.label} — no meetings`}>{closure.label}</span>}
              <div className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    type="button"
                    className={`meeting-chip ${event.category}${event.category === "committee" ? ` ${committeeToneClass(event.templateId)}` : ""} ${event.templateId.endsWith("retreat") ? "retreat" : "regular"}${isEventConfirmed(state, event) ? " confirmed" : " unconfirmed"}${state.eventOverrides[event.id]?.date ? " override" : ""}${event.conflicts.some((conflict) => conflict.type === "automatic_move") ? " holiday-adjusted" : ""}${event.locked ? " locked" : ""}${selectedEventId === event.id ? " selected" : ""}`}
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
                    onMouseEnter={(mouseEvent) => onHoverEvent({
                      title: event.title,
                      date: event.date,
                      x: mouseEvent.clientX,
                      y: mouseEvent.clientY,
                      note: event.conflicts.some((conflict) => conflict.type === "automatic_move")
                        ? `Moved from ${event.originalDate} because of a federal holiday`
                        : undefined,
                    })}
                    onMouseMove={(mouseEvent) => onHoverEvent({
                      title: event.title,
                      date: event.date,
                      x: mouseEvent.clientX,
                      y: mouseEvent.clientY,
                      note: event.conflicts.some((conflict) => conflict.type === "automatic_move")
                        ? `Moved from ${event.originalDate} because of a federal holiday`
                        : undefined,
                    })}
                    onMouseLeave={() => onHoverEvent(null)}
                    aria-label={`${event.title} on ${event.date}`}
                    title={`${event.title} · ${event.date}${event.locked ? " · confirmed anchor" : " · drag or click to adjust"}`}
                  >
                    {CALENDAR_LABELS[event.templateId] ?? event.abbreviation}
                  </button>
                ))}
                {dayImported.slice(0, 2).map((event) => (
                  <button
                    type="button"
                    className="meeting-chip outlook confirmed regular"
                    key={event.id}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onSelectImported(event.id);
                    }}
                    onMouseEnter={(mouseEvent) => onHoverEvent({
                      title: event.title,
                      date: event.date,
                      x: mouseEvent.clientX,
                      y: mouseEvent.clientY,
                    })}
                    onMouseMove={(mouseEvent) => onHoverEvent({
                      title: event.title,
                      date: event.date,
                      x: mouseEvent.clientX,
                      y: mouseEvent.clientY,
                    })}
                    onMouseLeave={() => onHoverEvent(null)}
                    title={`${event.title} — imported from ${event.sourceLabel}`}
                    aria-label={`${event.title} imported from Outlook`}
                  >
                    OUTLOOK
                  </button>
                ))}
                {dayEvents.length + dayImported.length > 5 && (
                  <span className="more-events">+{dayEvents.length + dayImported.length - 5}</span>
                )}
              </div>
              {pendingMove?.targetDate === isoDate && dayEvents.some((item) => item.id === pendingMove.eventId) && (
                <div className="calendar-move-popover" onClick={(event) => event.stopPropagation()}>
                  <strong>Keep this placement?</strong>
                  <p>Save it as the meeting rule or only for 2027.</p>
                  <div>
                    <button type="button" onClick={() => onResolveMove("rule")}>New rule</button>
                    <button type="button" onClick={() => onResolveMove("override")}>Just 2027</button>
                    <button type="button" onClick={onCancelMove}>Cancel</button>
                  </div>
                </div>
              )}
              {dayAction?.date === isoDate && !pendingMove && (
                <div className="day-action-popover" onClick={(event) => event.stopPropagation()}>
                  {dayAction.mode === "choose" && (
                    <>
                      <strong>{isoDate}</strong>
                      {closure ? (
                        <button type="button" onClick={() => { onRemoveClosure(isoDate); setDayAction(null); }}>Remove closure</button>
                      ) : (
                        <button type="button" disabled={Boolean(holiday)} onClick={() => setDayAction({ date: isoDate, mode: "closure", value: "" })}>Close this day</button>
                      )}
                      <button type="button" disabled={Boolean(holiday || closure)} onClick={() => setDayAction({ date: isoDate, mode: "event", value: "" })}>Add event</button>
                      <button className="quiet" type="button" onClick={() => setDayAction(null)}>Cancel</button>
                    </>
                  )}
                  {dayAction.mode !== "choose" && (
                    <form onSubmit={(event) => {
                      event.preventDefault();
                      if (dayAction.mode === "closure") onCloseDate(isoDate, dayAction.value);
                      else if (dayAction.value.trim()) onAddAdHoc(isoDate, dayAction.value.trim());
                      setDayAction(null);
                    }}>
                      <strong>{dayAction.mode === "closure" ? "Close this day" : "Add ad hoc event"}</strong>
                      <input autoFocus value={dayAction.value} onChange={(event) => setDayAction({ ...dayAction, value: event.target.value })} placeholder={dayAction.mode === "closure" ? "Optional label" : "Event name"} />
                      <div><button className="quiet" type="button" onClick={() => setDayAction({ date: isoDate, mode: "choose", value: "" })}>Back</button><button type="submit" disabled={dayAction.mode === "event" && !dayAction.value.trim()}>{dayAction.mode === "closure" ? "Close day" : "Add event"}</button></div>
                    </form>
                  )}
                </div>
              )}
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
  previewMove: PendingCalendarMove | null;
  onSelectEvent: (eventId: string) => void;
  onSelectImported: (eventId: string) => void;
  onMoveEvent: (eventId: string, date: string) => void;
  onResolveMove: (choice: "rule" | "override") => void;
  onCancelMove: () => void;
  onCloseDate: (date: string, label: string) => void;
  onRemoveClosure: (date: string) => void;
  onAddAdHoc: (date: string, title: string) => void;
}

export function PlanYearCalendar({
  state,
  importedEvents,
  selectedEventId,
  moveNotice,
  previewMove,
  onSelectEvent,
  onSelectImported,
  onMoveEvent,
  onResolveMove,
  onCancelMove,
  onCloseDate,
  onRemoveClosure,
  onAddAdHoc,
}: PlanYearCalendarProps) {
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [moveModeEventId, setMoveModeEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    board: true,
    committee: true,
    executive: true,
    organization: true,
    outlook: true,
  });
  const [hoveredEvent, setHoveredEvent] = useState<{
    title: string;
    date: string;
    x: number;
    y: number;
    note?: string;
  } | null>(null);
  const events = visiblePlanEvents(state).map((event) => {
    const resolved = resolvePlanEvent(state, event.id);
    return previewMove?.eventId === resolved.id
      ? { ...resolved, date: previewMove.targetDate }
      : resolved;
  }).filter((event) => filters[event.category]);
  const filteredImportedEvents = filters.outlook ? importedEvents : [];
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
          <p>Confirmed layers remain visible while you shape the active layer.</p>
        </div>
        <div className="calendar-legend" aria-label="Calendar legend">
          <div className="legend-colors">
            {([
              ["board", "Board"],
              ["committee", "Committee"],
              ["executive", "Executive"],
              ["organization", "Organization"],
              ["outlook", "Outlook"],
            ] as const).map(([category, label]) => (
              <button
                type="button"
                className={`calendar-filter${filters[category] ? " active" : ""}`}
                aria-pressed={filters[category]}
                onClick={() => setFilters((current) => ({ ...current, [category]: !current[category] }))}
                key={category}
              >
                <i className={`legend-dot ${category}`} />{label}
              </button>
            ))}
          </div>
          <div className="legend-status">
            <span><i className="legend-state working">Aa</i>Working</span>
            <span><i className="legend-state confirmed">Aa</i>Confirmed</span>
            <span><i className="legend-state override">Aa</i>Override</span>
          </div>
        </div>
      </div>
      <div
        className={`calendar-move-bar${moveNotice && !moveNotice.valid ? " invalid" : ""}`}
        aria-live="polite"
      >
        <span>
          {moveModeEventId
            ? "Choose a destination day on the calendar."
            : moveNotice?.message ?? "Drag a meeting label to another day."}
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
              importedEvents={filteredImportedEvents.filter(
                (event) => dateParts(event.date).month === monthIndex + 1,
              )}
              state={state}
              draggingEventId={draggingEventId}
              moveModeEventId={moveModeEventId}
              selectedEventId={selectedEventId}
              onSelectEvent={onSelectEvent}
              onSelectImported={onSelectImported}
              onMoveEvent={onMoveEvent}
              onDragStateChange={setDraggingEventId}
              onFinishMoveMode={() => setMoveModeEventId(null)}
              onHoverEvent={setHoveredEvent}
              pendingMove={previewMove}
              onResolveMove={onResolveMove}
              onCancelMove={onCancelMove}
              onCloseDate={onCloseDate}
              onRemoveClosure={onRemoveClosure}
              onAddAdHoc={onAddAdHoc}
            />
          ))}
        </div>
      </div>
      {hoveredEvent && (
        <div
          className="calendar-hover-tooltip"
          role="tooltip"
          style={{ left: hoveredEvent.x + 12, top: hoveredEvent.y + 14 }}
        >
          <strong>{hoveredEvent.title}</strong>
          <span>{hoveredEvent.date}</span>
          {hoveredEvent.note && <em>{hoveredEvent.note}</em>}
        </div>
      )}
    </section>
  );
}
