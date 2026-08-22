"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyLocalDecision,
  exportPlanCsv,
  generateCalendarPlan,
} from "@/lib/scheduling";
import type {
  DecisionItem,
  EventStatus,
  LocalDecision,
  MeetingCategory,
  ProposedEvent,
  RuleStatus,
  ScenarioSettings,
} from "@/lib/types";

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

const DEFAULT_SETTINGS: ScenarioSettings = {
  boardScenario: "continuity",
  allStaffPattern: "detailed_calendar",
};

const CATEGORY_LABELS: Record<MeetingCategory, string> = {
  board: "Board",
  committee: "Committee",
  executive: "Executive",
  organization: "Organization",
};

const STATUS_LABELS: Record<EventStatus, string> = {
  ready: "Ready for review",
  needs_decision: "Needs decision",
  blocked: "Blocked",
  reviewed: "POC reviewed",
  exception_approved: "POC exception",
};

const RULE_STATUS_LABELS: Record<RuleStatus, string> = {
  confirmed: "Confirmed",
  "2026_baseline": "2026 baseline",
  needs_validation: "Needs validation",
  open_question: "Open question",
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTime(time: string | null): string {
  if (!time) return "Time TBD";
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2027, 0, 1, hour, minute)));
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

function eventTone(event: ProposedEvent): string {
  if (event.status === "blocked") return "blocked";
  if (event.status === "needs_decision") return "decision";
  if (event.status === "exception_approved") return "exception";
  if (event.status === "reviewed") return "reviewed";
  return event.category;
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

interface MonthCardProps {
  monthIndex: number;
  events: ProposedEvent[];
  onSelect: (event: ProposedEvent) => void;
}

function MonthCard({ monthIndex, events, onSelect }: MonthCardProps) {
  const start = firstWeekday(monthIndex);
  const count = daysInMonth(monthIndex);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - start + 1;
    return day >= 1 && day <= count ? day : null;
  });
  const eventsByDay = new Map<number, ProposedEvent[]>();
  const placeholders = events.filter((event) => event.isPlaceholder);
  for (const event of events.filter((item) => !item.isPlaceholder)) {
    const { month, day } = dateParts(event.date);
    if (month !== monthIndex + 1) continue;
    const group = eventsByDay.get(day) ?? [];
    group.push(event);
    eventsByDay.set(day, group);
  }

  return (
    <section className="month-card" aria-label={`${MONTHS[monthIndex]} 2027`}>
      <header className="month-header">
        <h3>{MONTHS[monthIndex]}</h3>
        <span>{events.length} items</span>
      </header>
      {placeholders.length > 0 && (
        <div className="tbd-strip" aria-label={`${MONTHS[monthIndex]} dates still to determine`}>
          <span>TBD</span>
          {placeholders.map((event) => (
            <button
              type="button"
              key={event.id}
              onClick={() => onSelect(event)}
              title={`${event.name} — date not generated`}
            >
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
          const dayEvents = day ? eventsByDay.get(day) ?? [] : [];
          return (
            <div
              className={`day-cell${day ? "" : " outside"}`}
              key={`${monthIndex}-${index}`}
            >
              {day && <span className="day-number">{day}</span>}
              <div className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    type="button"
                    className={`event-chip ${eventTone(event)}`}
                    key={event.id}
                    onClick={() => onSelect(event)}
                    title={`${event.name} — ${STATUS_LABELS[event.status]}`}
                  >
                    {event.abbreviation}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="more-events">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface EventDetailProps {
  event: ProposedEvent;
  assumptions: { id: string; title: string; value: string }[];
  onClose: () => void;
  onDecision: (decision: LocalDecision) => void;
}

function EventDetail({ event, assumptions, onClose, onDecision }: EventDetailProps) {
  const eventAssumptions = assumptions.filter((assumption) =>
    event.assumptionIds.includes(assumption.id),
  );

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
        onMouseDown={(event_) => event_.stopPropagation()}
      >
        <div className="drawer-topline">
          <div>
            <span className={`status-pill ${event.status}`}>
              {STATUS_LABELS[event.status]}
            </span>
            <span className={`rule-pill ${event.ruleStatus}`}>
              {RULE_STATUS_LABELS[event.ruleStatus]}
            </span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </div>

        <p className="eyebrow">{CATEGORY_LABELS[event.category]} · {event.abbreviation}</p>
        <h2 id="event-detail-title">{event.name}</h2>
        <p className="detail-date">
          {event.isPlaceholder ? `${MONTHS[dateParts(event.date).month - 1]} — date TBD` : formatDate(event.date)}
        </p>
        <p className="detail-time">
          {formatTime(event.startTime)} · {durationLabel(event.durationMinutes)} · {event.modality}
        </p>

        <section className="detail-section callout">
          <h3>Why this result</h3>
          <p>{event.explanation}</p>
        </section>

        {event.conflicts.length > 0 && (
          <section className="detail-section">
            <h3>Conflicts and decisions</h3>
            <div className="conflict-stack">
              {event.conflicts.map((conflict) => (
                <article className={`conflict-card ${conflict.severity}`} key={conflict.id}>
                  <strong>{conflict.summary}</strong>
                  <p>{conflict.detail}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {event.alternatives.length > 0 && (
          <section className="detail-section">
            <h3>Recommended alternative</h3>
            {event.alternatives.map((alternative) => (
              <article className="alternative-card" key={`${alternative.date}-${alternative.startTime ?? ""}`}>
                <div>
                  <strong>{formatDate(alternative.date)}</strong>
                  <p>{alternative.reason}</p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    onDecision({
                      eventId: event.id,
                      action: "use_alternative",
                      selectedDate: alternative.date,
                      selectedStartTime: alternative.startTime ?? event.startTime,
                      decidedAt: new Date().toISOString(),
                    })
                  }
                >
                  Use in POC
                </button>
              </article>
            ))}
          </section>
        )}

        <section className="detail-section detail-grid">
          <div><span>Owner</span><strong>{event.owner}</strong></div>
          <div><span>Attendees</span><strong>{event.attendeeGroup}</strong></div>
          <div><span>Attendance</span><strong>{event.attendanceRequirement}</strong></div>
          <div><span>Flexibility</span><strong>{event.flexibility}</strong></div>
          <div><span>Location</span><strong>{event.location}</strong></div>
          <div><span>Purpose</span><strong>{event.purpose}</strong></div>
        </section>

        {eventAssumptions.length > 0 && (
          <section className="detail-section">
            <h3>POC assumptions used</h3>
            <ul className="plain-list">
              {eventAssumptions.map((assumption) => (
                <li key={assumption.id}>
                  <strong>{assumption.title}:</strong> {assumption.value}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="detail-section">
          <h3>Source trail</h3>
          <ul className="source-list">
            {event.sourceReferences.map((source) => (
              <li key={`${source.label}-${source.detail}`}>
                <strong>{source.label}</strong>
                <span>{source.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        {event.status !== "blocked" ? (
          <div className="drawer-actions">
            {!event.conflicts.some(
              (conflict) =>
                conflict.type === "holiday" || conflict.type === "blackout",
            ) && (
              <button
                className="button primary"
                type="button"
                onClick={() =>
                  onDecision({
                    eventId: event.id,
                    action: "reviewed",
                    decidedAt: new Date().toISOString(),
                  })
                }
              >
                {event.conflicts.length > 0
                  ? "Use assumption for POC"
                  : "Accept date for POC"}
              </button>
            )}
            {event.conflicts.some(
              (conflict) =>
                conflict.type === "holiday" || conflict.type === "blackout",
            ) && (
              <button
                className="button ghost"
                type="button"
                onClick={() =>
                  onDecision({
                    eventId: event.id,
                    action: "approve_exception",
                    rationale: "POC-only exception; organizational approval not recorded.",
                    decidedAt: new Date().toISOString(),
                  })
                }
              >
                Record POC exception
              </button>
            )}
          </div>
        ) : (
          <div className="blocked-action-note">
            Required information must be supplied before this item can be accepted in the POC.
          </div>
        )}
        <p className="safety-note">These actions change only this browser’s working scenario. They do not approve a rule or change Outlook.</p>
      </aside>
    </div>
  );
}

interface DecisionDetailProps {
  decision: DecisionItem;
  relatedEvents: ProposedEvent[];
  onClose: () => void;
  onOpenEvent: (event: ProposedEvent) => void;
}

function DecisionDetail({ decision, relatedEvents, onClose, onOpenEvent }: DecisionDetailProps) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-detail-title"
        onMouseDown={(event_) => event_.stopPropagation()}
      >
        <div className="drawer-topline">
          <span className={`status-pill ${decision.severity === "blocked" ? "blocked" : "needs_decision"}`}>
            {decision.severity === "blocked" ? "Required input" : "Leadership decision"}
          </span>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close decision details">×</button>
        </div>
        <p className="eyebrow">Decision Queue</p>
        <h2 id="decision-detail-title">{decision.title}</h2>
        <section className="detail-section callout">
          <h3>What the draft currently does</h3>
          <p>{decision.summary}</p>
        </section>
        <section className="detail-section">
          <h3>Question for the team</h3>
          <p className="decision-question">{decision.question}</p>
        </section>
        <section className="detail-section">
          <h3>Authority</h3>
          <p>{decision.source}</p>
        </section>
        {relatedEvents.length > 0 && (
          <section className="detail-section">
            <h3>Related proposed events</h3>
            <div className="related-events">
              {relatedEvents.slice(0, 8).map((event) => (
                <button type="button" key={event.id} onClick={() => onOpenEvent(event)}>
                  <span>{event.abbreviation}</span>
                  <strong>{event.isPlaceholder ? `${MONTHS[dateParts(event.date).month - 1]} — TBD` : formatDate(event.date)}</strong>
                </button>
              ))}
            </div>
          </section>
        )}
        <p className="safety-note">A meeting decision remains separate from the underlying rule status. Only an authorized owner can confirm the organizational rule.</p>
      </aside>
    </div>
  );
}

export function CalendarPlanner() {
  const [settings, setSettings] = useState<ScenarioSettings>(DEFAULT_SETTINGS);
  const [localDecisions, setLocalDecisions] = useState<LocalDecision[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Set<MeetingCategory>>(
    new Set(["board", "committee", "executive", "organization"]),
  );
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [showAssumptions, setShowAssumptions] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("lss-2027-poc-decisions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LocalDecision[];
        queueMicrotask(() => setLocalDecisions(parsed));
      } catch {
        window.localStorage.removeItem("lss-2027-poc-decisions");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "lss-2027-poc-decisions",
      JSON.stringify(localDecisions),
    );
  }, [localDecisions]);

  const plan = useMemo(
    () => generateCalendarPlan(settings, localDecisions),
    [settings, localDecisions],
  );

  const filteredEvents = useMemo(
    () =>
      plan.events.filter(
        (event) =>
          categories.has(event.category) &&
          (showPlaceholders || !event.isPlaceholder),
      ),
    [plan.events, categories, showPlaceholders],
  );

  const selectedEvent = plan.events.find((event) => event.id === selectedEventId) ?? null;
  const selectedDecision =
    plan.decisions.find((decision) => decision.id === selectedDecisionId) ?? null;

  const stats = {
    ready: plan.events.filter((event) => event.status === "ready").length,
    decisions: plan.events.filter((event) => event.status === "needs_decision").length,
    blocked: plan.events.filter((event) => event.status === "blocked").length,
    reviewed: plan.events.filter(
      (event) => event.status === "reviewed" || event.status === "exception_approved",
    ).length,
  };

  const toggleCategory = (category: MeetingCategory) => {
    setCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleDecision = (decision: LocalDecision) => {
    setLocalDecisions((current) => applyLocalDecision(current, decision));
    setSelectedEventId(null);
  };

  const resetScenario = () => {
    if (!window.confirm("Reset local POC reviews and alternatives? The source rules will not change.")) return;
    setLocalDecisions([]);
    window.localStorage.removeItem("lss-2027-poc-decisions");
  };

  const openDecision = (decision: DecisionItem) => {
    if (decision.relatedEventId) {
      setSelectedEventId(decision.relatedEventId);
      return;
    }
    setSelectedDecisionId(decision.id);
  };

  return (
    <main className="workbench-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">LSS</div>
          <div>
            <p className="eyebrow">Calendar planning workbench</p>
            <h1>2027 Working Draft</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="button ghost" type="button" onClick={() => window.print()}>Print</button>
          <button
            className="button secondary"
            type="button"
            onClick={() => downloadCsv("lss-2027-working-draft.csv", exportPlanCsv(plan))}
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="truth-banner">
        <div>
          <strong>POC scenario — not an approved LSS calendar</strong>
          <span>2026 evidence is projected into 2027. Every assumption and unresolved rule remains visible.</span>
        </div>
        <button type="button" onClick={() => setShowAssumptions((value) => !value)}>
          {showAssumptions ? "Hide assumptions" : `View ${plan.assumptions.length} assumptions`}
        </button>
      </section>

      {showAssumptions && (
        <section className="assumption-panel" aria-label="POC assumption register">
          {plan.assumptions.map((assumption) => (
            <article key={assumption.id}>
              <span>{assumption.id}</span>
              <h2>{assumption.title}</h2>
              <strong>{assumption.value}</strong>
              <p>{assumption.rationale}</p>
            </article>
          ))}
        </section>
      )}

      <section className="control-bar" aria-label="Calendar scenario controls">
        <label>
          <span>Board scenario</span>
          <select
            value={settings.boardScenario}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                boardScenario: event.target.value as ScenarioSettings["boardScenario"],
              }))
            }
          >
            <option value="continuity">2026 continuity baseline</option>
            <option value="recent_direction">Recent 2027 direction</option>
          </select>
        </label>
        <label>
          <span>All Staff source</span>
          <select
            value={settings.allStaffPattern}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                allStaffPattern: event.target.value as ScenarioSettings["allStaffPattern"],
              }))
            }
          >
            <option value="detailed_calendar">Detailed 2026 calendar</option>
            <option value="meeting_matrix">Meeting Matrix</option>
          </select>
        </label>
        <div className="category-filters" role="group" aria-label="Meeting categories">
          {(Object.keys(CATEGORY_LABELS) as MeetingCategory[]).map((category) => (
            <button
              type="button"
              key={category}
              className={categories.has(category) ? "active" : ""}
              onClick={() => toggleCategory(category)}
            >
              <span className={`category-dot ${category}`} />
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        <label className="checkbox-control">
          <input
            type="checkbox"
            checked={showPlaceholders}
            onChange={(event) => setShowPlaceholders(event.target.checked)}
          />
          Show TBD placeholders
        </label>
      </section>

      <section className="stat-grid" aria-label="Draft status summary">
        <article><span>Proposed items</span><strong>{plan.events.length}</strong><small>including month placeholders</small></article>
        <article className="ready"><span>Ready for review</span><strong>{stats.ready}</strong><small>no detected conflict</small></article>
        <article className="decision"><span>Needs decision</span><strong>{stats.decisions}</strong><small>choice or validation required</small></article>
        <article className="blocked"><span>Blocked</span><strong>{stats.blocked}</strong><small>required information missing</small></article>
        <article className="reviewed"><span>POC reviewed</span><strong>{stats.reviewed}</strong><small>local scenario only</small></article>
      </section>

      <div className="workspace-grid">
        <section className="calendar-section" aria-labelledby="calendar-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Year at a glance</p>
              <h2 id="calendar-heading">January–December 2027</h2>
            </div>
            <div className="status-legend" aria-label="Calendar status legend">
              <span><i className="ready" />Ready</span>
              <span><i className="decision" />Decision</span>
              <span><i className="blocked" />Blocked</span>
            </div>
          </div>
          <div className="year-grid">
            {MONTHS.map((month, monthIndex) => (
              <MonthCard
                key={month}
                monthIndex={monthIndex}
                events={filteredEvents.filter(
                  (event) => dateParts(event.date).month === monthIndex + 1,
                )}
                onSelect={(event) => setSelectedEventId(event.id)}
              />
            ))}
          </div>
        </section>

        <aside className="decision-queue" aria-labelledby="queue-heading">
          <div className="queue-header">
            <div>
              <p className="eyebrow">Leadership worklist</p>
              <h2 id="queue-heading">Decision Queue</h2>
            </div>
            <span>{plan.decisions.length}</span>
          </div>
          <p className="queue-intro">Resolve these items before treating the draft as reliable or publishing it to Outlook.</p>
          <div className="queue-list">
            {plan.decisions.map((decision) => (
              <button
                type="button"
                className={`queue-item ${decision.severity}`}
                key={decision.id}
                onClick={() => openDecision(decision)}
              >
                <span className="queue-severity">{decision.severity === "blocked" ? "Required input" : "Decision"}</span>
                <strong>{decision.title}</strong>
                <p>{decision.summary}</p>
                <span className="queue-action">Review →</span>
              </button>
            ))}
          </div>
          <footer className="queue-footer">
            <strong>Working-session rule</strong>
            <p>A scenario choice changes this draft. It does not confirm the organization’s permanent scheduling rule.</p>
            <button type="button" className="text-button" onClick={resetScenario}>Reset local POC decisions</button>
          </footer>
        </aside>
      </div>

      <footer className="app-footer">
        <span>Historical inputs: 2026 Board Calendar, LSS Meetings Calendar, Meeting Matrix, and MVP 1 Rulebook.</span>
        <strong>No Outlook connection · No autonomous calendar changes</strong>
      </footer>

      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          assumptions={plan.assumptions}
          onClose={() => setSelectedEventId(null)}
          onDecision={handleDecision}
        />
      )}
      {selectedDecision && (
        <DecisionDetail
          decision={selectedDecision}
          relatedEvents={plan.events.filter(
            (event) => event.templateId === selectedDecision.relatedTemplateId,
          )}
          onClose={() => setSelectedDecisionId(null)}
          onOpenEvent={(event) => {
            setSelectedDecisionId(null);
            setSelectedEventId(event.id);
          }}
        />
      )}
    </main>
  );
}
