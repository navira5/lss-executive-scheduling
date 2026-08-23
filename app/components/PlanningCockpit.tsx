"use client";

import { useMemo, useState } from "react";

import { buildMeetingTemplates } from "@/data/source-data";
import {
  parseCalendarSnapshot,
  type CalendarImportResult,
  type ImportedCalendarEvent,
} from "@/lib/calendar-import";
import {
  PHASE_ORDER,
  PLAN_STEPS,
  PHASE_LABELS,
  resolvePlanEvent,
  type PlanYearState,
  type WorkingMeetingRule,
} from "@/lib/plan-year";
import type { MeetingTemplate, ScenarioSettings } from "@/lib/types";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface PendingCalendarMove {
  eventId: string;
  targetDate: string;
}

export interface PendingFormatConversion {
  retreatEventId: string;
  regularEventId: string;
  targetDate: string;
}

interface MeetingGroup {
  id: string;
  label: string;
  templateIds: string[];
}

function groupFor(templateId: string): MeetingGroup {
  if (["full-board", "board-retreat"].includes(templateId)) {
    return { id: "full-board", label: "Full Board", templateIds: ["full-board", "board-retreat"] };
  }
  if (["executive-team", "executive-retreat"].includes(templateId)) {
    return { id: "executive-team", label: "Executive Team", templateIds: ["executive-team", "executive-retreat"] };
  }
  if (["leadership-team", "leadership-retreat"].includes(templateId)) {
    return { id: "leadership-team", label: "Leadership Team", templateIds: ["leadership-team", "leadership-retreat"] };
  }
  return { id: templateId, label: "", templateIds: [templateId] };
}

function historicalCount(templateId: string, fallback: number): number {
  const counts: Record<string, number> = {
    "full-board": 5,
    "board-retreat": 1,
    "critical-checkin": 6,
    "executive-committee": 6,
    "finance-committee": 6,
    "health-programs": 4,
    "talent-risk": 4,
    "board-orientation": 2,
  };
  return counts[templateId] ?? fallback;
}

function defaultWeekday(template: MeetingTemplate): number | null {
  return "weekday" in template.generation ? template.generation.weekday : null;
}

function formatName(template: MeetingTemplate): string {
  if (template.id === "full-board") return "Regular meetings";
  if (template.id === "board-retreat") return "Retreats";
  if (template.id.endsWith("-retreat")) return "Retreats";
  return template.name;
}

function countLabel(template: MeetingTemplate, count: number): string {
  const name = formatName(template).toLowerCase();
  if (count !== 1) return `${count} ${name}`;
  return `${count} ${name.replace(/s$/, "")}`;
}

function timeValue(value: string | null): string {
  return value ?? "";
}

interface PlanningCockpitProps {
  state: PlanYearState;
  selectedEventId: string | null;
  pendingMove: PendingCalendarMove | null;
  pendingConversion: PendingFormatConversion | null;
  importedEvents: ImportedCalendarEvent[];
  selectedImportedEventId: string | null;
  canUndo: boolean;
  onRuleChange: (templateId: string, patch: WorkingMeetingRule) => void;
  onSharedAttendeesChange: (templateIds: string[], attendees: string[]) => void;
  onBoardScenarioChange: (scenario: ScenarioSettings["boardScenario"]) => void;
  onResolveMove: (choice: "rule" | "override") => void;
  onCancelMove: () => void;
  onApplyConversion: () => void;
  onCancelConversion: () => void;
  onUndo: () => void;
  onConfirmPhase: () => void;
  onImport: (result: CalendarImportResult) => void;
}

export function PlanningCockpit({
  state,
  selectedEventId,
  pendingMove,
  pendingConversion,
  importedEvents,
  selectedImportedEventId,
  canUndo,
  onRuleChange,
  onSharedAttendeesChange,
  onBoardScenarioChange,
  onResolveMove,
  onCancelMove,
  onApplyConversion,
  onCancelConversion,
  onUndo,
  onConfirmPhase,
  onImport,
}: PlanningCockpitProps) {
  const [confirming, setConfirming] = useState(false);
  const templates = useMemo(
    () => buildMeetingTemplates(state.plan.settings),
    [state.plan.settings],
  );
  const selectedTemplateId = selectedEventId
    ? state.plan.events.find((event) => event.id === selectedEventId)?.templateId
    : null;
  const fallbackTemplateId = state.phaseSteps.flatMap((step) => step.templateIds)[0] ?? null;
  const group = groupFor(selectedTemplateId ?? fallbackTemplateId ?? "full-board");
  const groupTemplates = group.templateIds
    .map((id) => templates.find((template) => template.id === id))
    .filter((template): template is MeetingTemplate => Boolean(template));
  const groupEvents = state.plan.events
    .filter(
      (event) =>
        group.templateIds.includes(event.templateId) &&
        !state.hiddenEventIds.includes(event.id) &&
        !event.isPlaceholder,
    )
    .map((event) => resolvePlanEvent(state, event.id));
  const groupLabel = group.label || groupTemplates[0]?.name || "Meeting group";
  const variants = groupTemplates.map((template) => {
    const events = groupEvents.filter((event) => event.templateId === template.id);
    return {
      template,
      events,
      historical: historicalCount(template.id, events.length),
      planned: events.length,
      rule: state.workingRules[template.id] ?? {},
    };
  });
  const historicalTotal = variants.reduce((sum, variant) => sum + variant.historical, 0);
  const plannedTotal = variants.reduce((sum, variant) => sum + variant.planned, 0);
  const variantSummary = variants
    .map((variant) => countLabel(variant.template, variant.planned))
    .join(", ");
  const overrides = groupEvents.filter((event) => {
    const overrideDate = state.eventOverrides[event.id]?.date;
    const generatedDate = state.plan.events.find((item) => item.id === event.id)?.date;
    return Boolean(overrideDate && overrideDate !== generatedDate);
  });
  const groupPhase = PHASE_ORDER.find((phase) =>
    PLAN_STEPS[phase].some((step) =>
      step.templateIds.some((templateId) => group.templateIds.includes(templateId)),
    ),
  ) ?? state.activePhase;
  const editingAllowed = groupEvents.some((event) => !event.locked);
  const activePhaseIndex = PHASE_ORDER.indexOf(state.activePhase);
  const downstreamConfirmed = state.confirmedPhases.some(
    (phase) => PHASE_ORDER.indexOf(phase) > activePhaseIndex,
  );
  const prompt = !editingAllowed
    ? `Return to ${PHASE_LABELS[groupPhase]} to change this group.`
    : downstreamConfirmed && (overrides.length > 0 || group.templateIds.some((id) => state.workingRules[id]))
      ? "This earlier-layer change may affect placements in a downstream layer that was already confirmed."
      : state.activePhase === "board" && group.id === "full-board" && state.plan.settings.boardScenario === "continuity"
    ? "The documented 2027 direction proposes four regular meetings and two retreats. The current plan still reflects the 2026 mix."
    : overrides.length > 0
      ? `${overrides.length} placement${overrides.length === 1 ? " is" : "s are"} now outside the group rule.`
      : "";
  const phaseEvents = state.plan.events.filter((event) => {
    const phaseTemplateIds = new Set(state.phaseSteps.flatMap((step) => step.templateIds));
    return phaseTemplateIds.has(event.templateId) && !state.hiddenEventIds.includes(event.id) && !event.isPlaceholder;
  });
  const phaseSummary = state.activePhase === "board"
    ? `You're confirming ${phaseEvents.filter((event) => event.templateId === "full-board").length} board meetings and ${phaseEvents.filter((event) => event.templateId === "board-retreat").length} retreats for 2027. Executive Leadership planning will work around these dates.`
    : `You're confirming ${phaseEvents.length} ${PHASE_LABELS[state.activePhase]} placements for 2027. Later layers will work around these dates.`;

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      onImport(parseCalendarSnapshot(await file.text(), file.name));
    }
  };
  const selectedImported = selectedImportedEventId
    ? importedEvents.find((event) => event.id === selectedImportedEventId) ?? null
    : null;

  return (
    <aside className="cockpit" aria-label="Selected meeting group settings">
      <div className="cockpit-scroll">
        {selectedImported && (
          <section className="imported-snapshot-card">
            <p className="eyebrow">Existing Outlook meeting</p>
            <h2>{selectedImported.title}</h2>
            <dl>
              <div><dt>Date</dt><dd>{selectedImported.date}</dd></div>
              <div><dt>Time</dt><dd>{selectedImported.startTime ?? "All day"}</dd></div>
              <div><dt>Duration</dt><dd>{selectedImported.durationMinutes} min</dd></div>
              <div><dt>Location</dt><dd>{selectedImported.location || "Not provided"}</dd></div>
            </dl>
            <p>Read-only snapshot · used as scheduling context</p>
          </section>
        )}
        <section className="cockpit-summary">
          <div className="cockpit-title-row">
            <div>
              <p className="eyebrow">Meeting settings</p>
              <h2>{groupLabel} — {plannedTotal} sessions per year</h2>
            </div>
            <span className={`group-color ${groupTemplates[0]?.category ?? "board"}`} aria-hidden="true" />
          </div>
          <p>{variantSummary ? `${variantSummary}.` : "No meetings planned."}</p>
        </section>

        <section className="quick-compare" aria-label="2026 and 2027 meeting counts">
          <div><span>2026 actual</span><strong>{historicalTotal}</strong><small>{variants.map((variant) => countLabel(variant.template, variant.historical)).join(" · ")}</small></div>
          <div><span>2027 planned</span><strong>{plannedTotal}</strong><small>{variantSummary}</small></div>
        </section>

        <section className="format-settings">
          {variants.map(({ template, planned, rule }) => {
            const weekday = rule.weekday ?? defaultWeekday(template);
            const boardCountControl = group.id === "full-board";
            return (
              <article className="format-row" key={template.id}>
                <header>
                  <i className={`format-mark ${template.category} ${template.id.endsWith("retreat") ? "retreat" : "regular"}`} />
                  <strong>{formatName(template)}</strong>
                </header>
                <div className="setting-grid">
                  <label>
                    <span>Count</span>
                    {boardCountControl ? (
                      <select
                        disabled={!editingAllowed}
                        value={planned}
                        onChange={(event) => {
                          const count = Number(event.target.value);
                          const recent = template.id === "full-board" ? count === 4 : count === 2;
                          onBoardScenarioChange(recent ? "recent_direction" : "continuity");
                        }}
                      >
                        {template.id === "full-board" ? <><option value="5">5</option><option value="4">4</option></> : <><option value="1">1</option><option value="2">2</option></>}
                      </select>
                    ) : <output>{planned}</output>}
                  </label>
                  <label><span>Duration</span><div className="input-with-unit"><input disabled={!editingAllowed} type="number" min="15" step="15" value={rule.durationMinutes ?? template.durationMinutes} onChange={(event) => onRuleChange(template.id, { durationMinutes: Number(event.target.value) })} /><i>min</i></div></label>
                  <label><span>Time</span><input disabled={!editingAllowed} type="time" value={timeValue(rule.startTime ?? template.startTime)} onChange={(event) => onRuleChange(template.id, { startTime: event.target.value || null })} /></label>
                  <label>
                    <span>Preferred day</span>
                    <select disabled={!editingAllowed} value={weekday ?? ""} onChange={(event) => onRuleChange(template.id, { weekday: Number(event.target.value) })}>
                      {weekday === null && <option value="" disabled>Choose</option>}
                      {WEEKDAYS.map((day, index) => <option value={index} key={day}>{day}</option>)}
                    </select>
                  </label>
                </div>
              </article>
            );
          })}
        </section>

        <section className="shared-attendees">
          <label>
            <span>Shared attendees <i>one per line</i></span>
            <textarea
              disabled={!editingAllowed}
              rows={3}
              defaultValue={(state.workingRules[group.templateIds[0]]?.attendees ?? [groupTemplates[0]?.attendeeGroup ?? "To confirm"]).join("\n")}
              onBlur={(event) => {
                const attendees = event.target.value.split("\n").map((item) => item.trim()).filter(Boolean);
                onSharedAttendeesChange(group.templateIds, attendees);
              }}
            />
          </label>
        </section>

        {pendingConversion && (
          <section className="context-prompt decision">
            <span>Format conversion</span>
            <p>Convert this regular meeting slot to a retreat?</p>
            <div><button type="button" onClick={onApplyConversion}>Convert meeting</button><button type="button" onClick={onCancelConversion}>Cancel</button></div>
          </section>
        )}

        {pendingMove && !pendingConversion && (
          <section className="context-prompt decision">
            <span>Placement changed</span>
            <p>Should this become the new meeting rule or apply only to 2027?</p>
            <div><button type="button" onClick={() => onResolveMove("rule")}>New rule</button><button type="button" onClick={() => onResolveMove("override")}>Just 2027</button><button type="button" onClick={onCancelMove}>Cancel</button></div>
          </section>
        )}

        {prompt && !pendingMove && !pendingConversion && (
          <section className="context-prompt">
            <span>Worth noticing</span>
            <p>{prompt}</p>
          </section>
        )}

        {overrides.length > 0 && (
          <section className="override-list">
            <h3>2027 overrides</h3>
            {overrides.map((event) => (
              <p key={event.id}><strong>{event.date}</strong><span>Manually moved from {state.plan.events.find((item) => item.id === event.id)?.date ?? "its generated date"}.</span></p>
            ))}
          </section>
        )}

        <details className="snapshot-import">
          <summary>Existing Outlook snapshot <i>{importedEvents.length || ""}</i></summary>
          <label><input type="file" accept=".ics,text/calendar" multiple onChange={(event) => void importFiles(event.target.files)} /><span>Import .ics snapshot locally</span></label>
        </details>
      </div>

      <div className="cockpit-footer">
        <button className="undo-button" type="button" disabled={!canUndo} onClick={onUndo}>Undo last change</button>
        {state.activePhase !== "review" && !confirming && (
          <button className="button primary full" type="button" onClick={() => setConfirming(true)}>Confirm {PHASE_LABELS[state.activePhase]}</button>
        )}
        {confirming && (
          <div className="confirmation-moment">
            <strong>Confirm this layer?</strong>
            <p>{phaseSummary}</p>
            <div><button type="button" onClick={() => setConfirming(false)}>Keep editing</button><button type="button" onClick={() => { setConfirming(false); onConfirmPhase(); }}>Confirm layer</button></div>
          </div>
        )}
      </div>
    </aside>
  );
}
