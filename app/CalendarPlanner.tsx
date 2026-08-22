"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyLocalDecision,
  exportPlanCsv,
  generateCalendarPlan,
} from "@/lib/scheduling";
import { buildMeetingTemplates } from "@/data/source-data";
import type {
  DecisionItem,
  EventStatus,
  HolidayConstraint,
  LocalDecision,
  MeetingCategory,
  MeetingTemplate,
  ProposedEvent,
  RuleStatus,
  ScenarioSettings,
  WorkingRuleOverride,
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
  return `${event.category} status-${event.status}`;
}

interface DiscoveryResponse {
  disposition: "captured" | "follow_up";
  note: string;
  recordedAt: string;
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
  holidays: HolidayConstraint[];
  onSelect: (event: ProposedEvent) => void;
}

function MonthCard({ monthIndex, events, holidays, onSelect }: MonthCardProps) {
  const start = firstWeekday(monthIndex);
  const count = daysInMonth(monthIndex);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - start + 1;
    return day >= 1 && day <= count ? day : null;
  });
  const eventsByDay = new Map<number, ProposedEvent[]>();
  const holidaysByDay = new Map<number, HolidayConstraint>();
  for (const holiday of holidays) {
    const { month, day } = dateParts(holiday.date);
    if (month === monthIndex + 1) holidaysByDay.set(day, holiday);
  }
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
          const holiday = day ? holidaysByDay.get(day) : undefined;
          return (
            <div
              className={`day-cell${day ? "" : " outside"}${holiday ? " holiday" : ""}`}
              key={`${monthIndex}-${index}`}
            >
              {day && <span className="day-number">{day}</span>}
              {holiday && (
                <span
                  className={`holiday-marker ${holiday.status}`}
                  title={`${holiday.name} — no meetings`}
                >
                  Holiday
                </span>
              )}
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

interface DiscoveryWorkspaceProps {
  decisions: DecisionItem[];
  events: ProposedEvent[];
  responses: Record<string, DiscoveryResponse>;
  currentIndex: number;
  settings: ScenarioSettings;
  onIndexChange: (index: number) => void;
  onRecord: (decisionId: string, response: DiscoveryResponse) => void;
  onSettingsChange: (settings: ScenarioSettings) => void;
  onOpenEvent: (eventId: string) => void;
  onViewRule: (templateId: string) => void;
}

function DiscoveryWorkspace({
  decisions,
  events,
  responses,
  currentIndex,
  settings,
  onIndexChange,
  onRecord,
  onSettingsChange,
  onOpenEvent,
  onViewRule,
}: DiscoveryWorkspaceProps) {
  const decision = decisions[currentIndex];
  const existing = decision ? responses[decision.id] : undefined;
  const completed = decisions.filter((item) => responses[item.id]).length;
  const [note, setNote] = useState(existing?.note ?? "");

  if (!decision) {
    return <p className="empty-state">No discovery topics remain in this scenario.</p>;
  }

  const relatedEvent = decision.relatedEventId
    ? events.find((event) => event.id === decision.relatedEventId)
    : undefined;
  const record = (disposition: DiscoveryResponse["disposition"]) => {
    onRecord(decision.id, {
      disposition,
      note: note.trim() || decision.summary,
      recordedAt: new Date().toISOString(),
    });
    if (currentIndex < decisions.length - 1) onIndexChange(currentIndex + 1);
  };

  return (
    <div className="discovery-workspace">
      <div className="discovery-progress">
        <div>
          <span>{completed} of {decisions.length} topics captured</span>
          <strong>{Math.round((completed / Math.max(decisions.length, 1)) * 100)}%</strong>
        </div>
        <progress value={completed} max={Math.max(decisions.length, 1)} />
      </div>

      <label className="topic-jump">
        <span>Discovery topic</span>
        <select value={currentIndex} onChange={(event) => onIndexChange(Number(event.target.value))}>
          {decisions.map((item, index) => (
            <option key={item.id} value={index}>
              {responses[item.id] ? "✓ " : ""}{index + 1}. {item.title}
            </option>
          ))}
        </select>
      </label>

      <article className="discovery-card">
        <div className="discovery-card-topline">
          <span className={`discovery-kind ${decision.severity}`}>
            {decision.severity === "blocked" ? "Input needed" : "Choice needed"}
          </span>
          {existing && (
            <span className={`captured-state ${existing.disposition}`}>
              {existing.disposition === "captured" ? "Captured" : "Follow-up"}
            </span>
          )}
        </div>
        <p className="topic-counter">Topic {currentIndex + 1}</p>
        <h3>{decision.title}</h3>
        <p className="discovery-question">{decision.question}</p>

        {decision.id === "D-BOARD" && (
          <label className="inline-rule-control">
            <span>Working calendar choice</span>
            <select
              value={settings.boardScenario}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  boardScenario: event.target.value as ScenarioSettings["boardScenario"],
                })
              }
            >
              <option value="continuity">Continue the 2026 rhythm</option>
              <option value="recent_direction">Four meetings + two retreats</option>
            </select>
          </label>
        )}

        {decision.id === "D-ALL-STAFF" && (
          <label className="inline-rule-control">
            <span>Working calendar choice</span>
            <select
              value={settings.allStaffPattern}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  allStaffPattern: event.target.value as ScenarioSettings["allStaffPattern"],
                })
              }
            >
              <option value="detailed_calendar">Jan / Apr / Jul / Oct · 60 min</option>
              <option value="meeting_matrix">Feb / May / Aug / Nov · 45 min</option>
            </select>
          </label>
        )}

        <label className="working-answer">
          <span>Working answer or facilitator note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Capture what Rachel, Kim, or the team decides…"
            rows={3}
          />
        </label>

        <details className="evidence-details">
          <summary>Why this surfaced</summary>
          <p>{decision.summary}</p>
          <small>{decision.source}</small>
        </details>

        <div className="context-links">
          {relatedEvent && (
            <button type="button" onClick={() => onOpenEvent(relatedEvent.id)}>
              Show proposed meeting
            </button>
          )}
          {decision.relatedTemplateId && (
            <button type="button" onClick={() => onViewRule(decision.relatedTemplateId!)}>
              Open rule
            </button>
          )}
        </div>

        <div className="discovery-actions">
          <button type="button" className="button primary" onClick={() => record("captured")}>
            Capture & continue
          </button>
          <button type="button" className="button ghost" onClick={() => record("follow_up")}>
            Needs follow-up
          </button>
        </div>
      </article>

      <div className="discovery-nav">
        <button type="button" disabled={currentIndex === 0} onClick={() => onIndexChange(currentIndex - 1)}>← Previous</button>
        <button type="button" disabled={currentIndex === decisions.length - 1} onClick={() => onIndexChange(currentIndex + 1)}>Next →</button>
      </div>
    </div>
  );
}

interface RulebookWorkspaceProps {
  templates: MeetingTemplate[];
  overrides: Record<string, WorkingRuleOverride>;
  selectedRuleId: string;
  onSelectRule: (id: string) => void;
  onUpdateOverride: (id: string, value: WorkingRuleOverride) => void;
}

function RulebookWorkspace({
  templates,
  overrides,
  selectedRuleId,
  onSelectRule,
  onUpdateOverride,
}: RulebookWorkspaceProps) {
  const [search, setSearch] = useState("");
  const selected = templates.find((template) => template.id === selectedRuleId) ?? templates[0];
  const filtered = templates.filter((template) =>
    `${template.name} ${template.abbreviation} ${template.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  if (!selected) return <p className="empty-state">No rules are loaded.</p>;
  const override = overrides[selected.id] ?? {};
  const update = (next: Partial<WorkingRuleOverride>) =>
    onUpdateOverride(selected.id, { ...override, ...next });

  return (
    <div className="rulebook-workspace">
      <label className="rule-search">
        <span>Find a meeting rule</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Board, retreat, finance…" />
      </label>
      <div className="rule-list" aria-label="Meeting rulebook">
        {filtered.map((template) => (
          <button
            type="button"
            key={template.id}
            className={`${template.category}${template.id === selected.id ? " selected" : ""}`}
            onClick={() => onSelectRule(template.id)}
          >
            <span className={`category-dot ${template.category}`} />
            <span><strong>{template.name}</strong><small>{template.cadence}</small></span>
            {overrides[template.id] && <i title="Working override applied">Edited</i>}
          </button>
        ))}
      </div>

      <article className="rule-editor">
        <div className="rule-editor-heading">
          <div>
            <span className={`meeting-type-pill ${selected.category}`}>{CATEGORY_LABELS[selected.category]}</span>
            <span className={`rule-pill ${selected.ruleStatus}`}>{RULE_STATUS_LABELS[selected.ruleStatus]}</span>
          </div>
          <h3>{selected.name}</h3>
          <p>{selected.purpose}</p>
        </div>

        <div className="rule-summary-grid">
          <div><span>Cadence</span><strong>{selected.cadence}</strong></div>
          <div><span>Flexibility</span><strong>{selected.flexibility === "protected" ? "🛡 Protected" : selected.flexibility === "flexible" ? "↔ Flexible" : "◐ Conditional"}</strong></div>
          <div><span>Attendees</span><strong>{selected.attendeeGroup}</strong></div>
          <div><span>Attendance</span><strong>{selected.attendanceRequirement}</strong></div>
        </div>

        <div className="working-rule-editor">
          <div>
            <p className="eyebrow">Working POC update</p>
            <small>These values regenerate this browser’s draft. They do not confirm the source rule.</small>
          </div>
          <label><span>Owner</span><input value={override.owner ?? selected.owner} onChange={(event) => update({ owner: event.target.value })} /></label>
          <label><span>Start time</span><input type="time" value={override.startTime ?? selected.startTime ?? ""} onChange={(event) => update({ startTime: event.target.value || null })} /></label>
          <label><span>Duration (minutes)</span><input type="number" min="15" step="15" value={override.durationMinutes ?? selected.durationMinutes} onChange={(event) => update({ durationMinutes: Number(event.target.value) })} /></label>
          <label><span>Location</span><input value={override.location ?? selected.location} onChange={(event) => update({ location: event.target.value })} /></label>
          <label className="wide"><span>Rule update note</span><textarea rows={2} value={override.note ?? ""} onChange={(event) => update({ note: event.target.value })} placeholder="Capture a cadence or dependency change for formal validation…" /></label>
          {overrides[selected.id] && (
            <button type="button" className="text-button reset-rule" onClick={() => onUpdateOverride(selected.id, {})}>Reset working update</button>
          )}
        </div>

        <details className="evidence-details rule-evidence">
          <summary>Source evidence ({selected.sourceReferences.length})</summary>
          {selected.sourceReferences.map((source) => (
            <p key={`${source.label}-${source.detail}`}><strong>{source.label}</strong><br />{source.detail}</p>
          ))}
        </details>
      </article>
    </div>
  );
}

export function CalendarPlanner() {
  const [settings, setSettings] = useState<ScenarioSettings>(DEFAULT_SETTINGS);
  const [localDecisions, setLocalDecisions] = useState<LocalDecision[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"discovery" | "rulebook">("discovery");
  const [discoveryIndex, setDiscoveryIndex] = useState(0);
  const [discoveryResponses, setDiscoveryResponses] = useState<Record<string, DiscoveryResponse>>({});
  const [ruleOverrides, setRuleOverrides] = useState<Record<string, WorkingRuleOverride>>({});
  const [selectedRuleId, setSelectedRuleId] = useState("full-board");
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
    const savedDiscovery = window.localStorage.getItem("lss-2027-discovery-responses");
    if (savedDiscovery) {
      try {
        const parsed = JSON.parse(savedDiscovery) as Record<string, DiscoveryResponse>;
        queueMicrotask(() => setDiscoveryResponses(parsed));
      } catch {
        window.localStorage.removeItem("lss-2027-discovery-responses");
      }
    }
    const savedOverrides = window.localStorage.getItem("lss-2027-rule-overrides");
    if (savedOverrides) {
      try {
        const parsed = JSON.parse(savedOverrides) as Record<string, WorkingRuleOverride>;
        queueMicrotask(() => setRuleOverrides(parsed));
      } catch {
        window.localStorage.removeItem("lss-2027-rule-overrides");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "lss-2027-poc-decisions",
      JSON.stringify(localDecisions),
    );
  }, [localDecisions]);

  useEffect(() => {
    window.localStorage.setItem(
      "lss-2027-discovery-responses",
      JSON.stringify(discoveryResponses),
    );
  }, [discoveryResponses]);

  useEffect(() => {
    window.localStorage.setItem(
      "lss-2027-rule-overrides",
      JSON.stringify(ruleOverrides),
    );
  }, [ruleOverrides]);

  const plan = useMemo(
    () => generateCalendarPlan(settings, localDecisions, ruleOverrides),
    [settings, localDecisions, ruleOverrides],
  );
  const templates = useMemo(() => buildMeetingTemplates(settings), [settings]);

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
  const safeDiscoveryIndex = Math.min(
    discoveryIndex,
    Math.max(plan.decisions.length - 1, 0),
  );

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
    if (!window.confirm("Reset local POC reviews, discovery notes, and working rule updates? The source rules will not change.")) return;
    setLocalDecisions([]);
    setDiscoveryResponses({});
    setRuleOverrides({});
    setDiscoveryIndex(0);
    window.localStorage.removeItem("lss-2027-poc-decisions");
    window.localStorage.removeItem("lss-2027-discovery-responses");
    window.localStorage.removeItem("lss-2027-rule-overrides");
  };

  const openRule = (templateId: string) => {
    setSelectedRuleId(templateId);
    setWorkspaceMode("rulebook");
  };

  const updateRuleOverride = (id: string, value: WorkingRuleOverride) => {
    setRuleOverrides((current) => {
      if (Object.keys(value).length === 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: value };
    });
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
              className={`${category}${categories.has(category) ? " active" : ""}`}
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
            <div className="status-legend" aria-label="Calendar state legend">
              <span><i className="needs-input">•</i>Needs input</span>
              <span><i className="blocked">×</i>Blocked</span>
              <span><i className="reviewed">✓</i>Reviewed</span>
              <span><i className="holiday" />Holiday</span>
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
                holidays={plan.holidays.filter(
                  (holiday) => dateParts(holiday.date).month === monthIndex + 1,
                )}
                onSelect={(event) => setSelectedEventId(event.id)}
              />
            ))}
          </div>
        </section>

        <aside className="planning-workspace" aria-label="Planning session and rulebook">
          <div className="workspace-tabs" role="tablist" aria-label="Planning tools">
            <button
              type="button"
              role="tab"
              aria-selected={workspaceMode === "discovery"}
              className={workspaceMode === "discovery" ? "active" : ""}
              onClick={() => setWorkspaceMode("discovery")}
            >
              Discovery session
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceMode === "rulebook"}
              className={workspaceMode === "rulebook" ? "active" : ""}
              onClick={() => setWorkspaceMode("rulebook")}
            >
              Rulebook
            </button>
          </div>

          {workspaceMode === "discovery" ? (
            <DiscoveryWorkspace
              key={plan.decisions[safeDiscoveryIndex]?.id ?? "empty"}
              decisions={plan.decisions}
              events={plan.events}
              responses={discoveryResponses}
              currentIndex={safeDiscoveryIndex}
              settings={settings}
              onIndexChange={setDiscoveryIndex}
              onRecord={(decisionId, response) =>
                setDiscoveryResponses((current) => ({
                  ...current,
                  [decisionId]: response,
                }))
              }
              onSettingsChange={setSettings}
              onOpenEvent={setSelectedEventId}
              onViewRule={openRule}
            />
          ) : (
            <RulebookWorkspace
              templates={templates}
              overrides={ruleOverrides}
              selectedRuleId={selectedRuleId}
              onSelectRule={setSelectedRuleId}
              onUpdateOverride={updateRuleOverride}
            />
          )}

          <footer className="workspace-footer">
            <strong>Working-session safety</strong>
            <p>Captured answers and edits change only this browser’s draft. Source-rule authority remains unchanged.</p>
            <button type="button" className="text-button" onClick={resetScenario}>Reset local session</button>
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
    </main>
  );
}
