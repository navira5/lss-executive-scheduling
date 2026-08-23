"use client";

import { useEffect, useMemo, useState } from "react";

import { PlanYearAgent } from "@/app/components/PlanYearAgent";
import { PlanYearCalendar } from "@/app/components/PlanYearCalendar";
import {
  PlanYearContext,
  type ImportedDisposition,
} from "@/app/components/PlanYearContext";
import type {
  CalendarImportResult,
  ImportedCalendarEvent,
} from "@/lib/calendar-import";
import {
  advancePlanStep,
  applyPlanProposal,
  bulkUpdateByExactTitle,
  clearActivePhase,
  confirmActivePhase,
  createPlanYearState,
  PHASE_LABELS,
  PHASE_ORDER,
  proposeEventMove,
  regenerateActivePhase,
  reopenPhase,
  resolvePlanEvent,
  updateWorkingRule,
  visiblePlanEvents,
  type PlanChangeProposal,
  type PlanEventOverride,
  type PlanYearState,
  type WorkingMeetingRule,
} from "@/lib/plan-year";
import { generateCalendarPlan } from "@/lib/scheduling";
import type { ScenarioSettings } from "@/lib/types";

const STORAGE_KEY = "lss-plan-year-2027-v1";
const IMPORT_KEY = "lss-plan-year-outlook-v1";
const DEFAULT_SETTINGS: ScenarioSettings = {
  boardScenario: "continuity",
  allStaffPattern: "detailed_calendar",
};

interface StoredPlanYear {
  version: 1;
  state: PlanYearState;
  importedEvents: ImportedCalendarEvent[];
  importedDispositions: Record<string, ImportedDisposition>;
}

function initialState(settings: ScenarioSettings = DEFAULT_SETTINGS): PlanYearState {
  return createPlanYearState(generateCalendarPlan(settings));
}

function download(filename: string, contents: string) {
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

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function workingCsv(state: PlanYearState, importedEvents: ImportedCalendarEvent[]): string {
  const header = [
    "Date",
    "Time",
    "Duration",
    "Meeting",
    "Category",
    "Location",
    "Attendees",
    "Source",
  ];
  const planRows = state.plan.events
    .filter((event) => !state.hiddenEventIds.includes(event.id) && !event.isPlaceholder)
    .map((event) => {
      const resolved = resolvePlanEvent(state, event.id);
      return [
        resolved.date,
        resolved.startTime ?? "TBD",
        resolved.durationMinutes,
        resolved.title,
        resolved.category,
        resolved.location,
        resolved.attendees.join("; "),
        "Plan Year",
      ];
    });
  const importedRows = importedEvents.map((event) => [
    event.date,
    event.startTime ?? "All day",
    event.durationMinutes,
    event.title,
    "Existing Outlook",
    event.location ?? "",
    event.attendees?.join("; ") ?? "",
    event.sourceLabel,
  ]);
  return [header, ...planRows, ...importedRows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

export function CalendarPlanner() {
  const [state, setState] = useState<PlanYearState>(() => initialState());
  const [importedEvents, setImportedEvents] = useState<ImportedCalendarEvent[]>([]);
  const [importedDispositions, setImportedDispositions] = useState<
    Record<string, ImportedDisposition>
  >({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedImportedId, setSelectedImportedId] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PlanChangeProposal | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const stored = JSON.parse(saved) as StoredPlanYear;
        if (stored.version === 1 && stored.state?.plan?.year === 2027) {
          queueMicrotask(() => {
            setState(stored.state);
            setImportedEvents(stored.importedEvents ?? []);
            setImportedDispositions(stored.importedDispositions ?? {});
          });
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    queueMicrotask(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const stored: StoredPlanYear = {
      version: 1,
      state,
      importedEvents,
      importedDispositions,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [state, importedEvents, importedDispositions, loaded]);

  const visibleEvents = useMemo(() => visiblePlanEvents(state), [state]);
  const activeStep = state.phaseSteps[state.activeStepIndex];
  const currentStepEvents = visibleEvents.filter((event) =>
    activeStep.templateIds.includes(event.templateId),
  );
  const selectedStillVisible = selectedEventId
    ? visibleEvents.some((event) => event.id === selectedEventId)
    : false;
  const effectiveSelectedEventId = selectedStillVisible
    ? selectedEventId
    : currentStepEvents[0]?.id ?? visibleEvents[0]?.id ?? null;

  const handleProposeMeeting = (eventId: string, patch: PlanEventOverride) => {
    const event = resolvePlanEvent(state, eventId);
    const move = proposeEventMove(state, eventId, patch.date ?? event.date);
    if (!move.valid) {
      setPendingChange(move);
      return;
    }
    setPendingChange({
      valid: true,
      summary: `Update ${event.title}.`,
      changes: [{ eventId, patch }],
    });
  };

  const handleBulkUpdate = (exactTitle: string, patch: PlanEventOverride) => {
    try {
      const result = bulkUpdateByExactTitle(state, exactTitle, patch);
      const confirmed = window.confirm(
        `Update ${result.includedEventIds.length} meeting${result.includedEventIds.length === 1 ? "" : "s"} titled “${exactTitle}”? ${result.excludedEventIds.length} custom-title meeting${result.excludedEventIds.length === 1 ? " is" : "s are"} excluded.`,
      );
      if (confirmed) setState(result.state);
    } catch (error) {
      setPendingChange({
        valid: false,
        summary: "The bulk update cannot be applied.",
        reason: error instanceof Error ? error.message : "The layer is locked.",
        changes: [],
      });
    }
  };

  const handleUpdateRule = (templateId: string, rule: WorkingMeetingRule) => {
    try {
      setState((current) => updateWorkingRule(current, templateId, rule));
    } catch (error) {
      setPendingChange({
        valid: false,
        summary: "The working rule could not be saved.",
        reason: error instanceof Error ? error.message : "The layer is locked.",
        changes: [],
      });
    }
  };

  const importSnapshot = (result: CalendarImportResult) => {
    setImportedEvents((current) => {
      const byId = new Map(current.map((event) => [event.id, event]));
      for (const event of result.events) byId.set(event.id, event);
      return [...byId.values()];
    });
  };

  const reset = () => {
    if (!window.confirm("Start Plan Year over? This clears browser-local planning changes and imported snapshots.")) return;
    setState(initialState());
    setImportedEvents([]);
    setImportedDispositions({});
    setSelectedEventId(null);
    setSelectedImportedId(null);
    setPendingChange(null);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(IMPORT_KEY);
  };

  const changeBoardScenario = (value: ScenarioSettings["boardScenario"]) => {
    if (!window.confirm("Changing the Board baseline restarts the local Plan Year meeting plan. Continue?")) return;
    setState(initialState({ ...state.plan.settings, boardScenario: value }));
    setPendingChange(null);
  };

  const activePhaseIndex = PHASE_ORDER.indexOf(state.activePhase);
  const confirmedCount = state.confirmedPhases.length;

  return (
    <main className="plan-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">LSS</div>
          <div>
            <p className="eyebrow">Annual calendar planning</p>
            <h1>Plan Year 2027</h1>
          </div>
        </div>
        <div className="header-status">
          <span><i /> Working plan · saved in this browser</span>
          <strong>{confirmedCount} of 4 layers confirmed</strong>
        </div>
        <div className="header-actions">
          <button className="button ghost" type="button" onClick={() => window.print()}>Print</button>
          <button className="button secondary" type="button" onClick={() => download("lss-plan-year-2027.csv", workingCsv(state, importedEvents))}>Export CSV</button>
        </div>
      </header>

      <section className="scope-banner">
        <div>
          <strong>Build the year in layers</strong>
          <span>Earlier decisions stay visible as protected anchors while you plan the next meeting group.</span>
        </div>
        <label>
          <span>Board starting point</span>
          <select value={state.plan.settings.boardScenario} onChange={(event) => changeBoardScenario(event.target.value as ScenarioSettings["boardScenario"])}>
            <option value="continuity">2026 continuity baseline</option>
            <option value="recent_direction">Four meetings + two retreats</option>
          </select>
        </label>
      </section>

      <div className="plan-layout">
        <nav className="phase-rail" aria-label="Plan Year phases">
          <div className="phase-rail-heading">
            <span>Plan Year</span>
            <strong>{Math.round(((activePhaseIndex + state.activeStepIndex / Math.max(state.phaseSteps.length, 1)) / PHASE_ORDER.length) * 100)}%</strong>
          </div>
          <div className="phase-list">
            {PHASE_ORDER.map((phase, index) => {
              const confirmed = state.confirmedPhases.includes(phase);
              const active = state.activePhase === phase;
              const future = index > activePhaseIndex && !confirmed;
              return (
                <button
                  type="button"
                  className={`${active ? "active" : ""}${confirmed ? " confirmed" : ""}`}
                  key={phase}
                  disabled={future || active}
                  onClick={() => {
                    if (confirmed && window.confirm(`Reopen ${PHASE_LABELS[phase]}? Later layers will require review again.`)) {
                      setState((current) => reopenPhase(current, phase));
                    }
                  }}
                >
                  <i>{confirmed ? "✓" : index + 1}</i>
                  <span><strong>{PHASE_LABELS[phase]}</strong><small>{active ? "Planning now" : confirmed ? "Confirmed · click to reopen" : "Waiting"}</small></span>
                </button>
              );
            })}
          </div>
          <div className="step-list">
            <span>{PHASE_LABELS[state.activePhase]} steps</span>
            {state.phaseSteps.map((step, index) => (
              <div key={step.id} className={`${index === state.activeStepIndex ? "active" : ""}${index < state.activeStepIndex ? " complete" : ""}`}>
                <i>{index < state.activeStepIndex ? "✓" : index + 1}</i>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          <div className="phase-help">
            <strong>Calendar controls</strong>
            <p>Drag an active meeting to a new day, click it to edit details, or ask the agent.</p>
          </div>
        </nav>

        <div className="planning-canvas">
          <PlanYearAgent
            state={state}
            pendingChange={pendingChange}
            onPendingChange={setPendingChange}
            onApplyChange={(proposal) => {
              setState((current) => applyPlanProposal(current, proposal));
              setPendingChange(null);
            }}
            onAdvance={() => {
              setState((current) => advancePlanStep(current));
              setSelectedEventId(null);
              setPendingChange(null);
            }}
            onConfirm={() => {
              try {
                setState((current) => confirmActivePhase(current));
                setSelectedEventId(null);
                setPendingChange(null);
              } catch (error) {
                setPendingChange({
                  valid: false,
                  summary: "This layer is not ready to confirm.",
                  reason: error instanceof Error ? error.message : "Finish the current steps first.",
                  changes: [],
                });
              }
            }}
            onClear={() => {
              if (window.confirm(`Clear all unconfirmed ${PHASE_LABELS[state.activePhase]} meetings from the working view?`)) {
                setState((current) => clearActivePhase(current));
              }
            }}
            onRegenerate={() => setState((current) => regenerateActivePhase(current))}
          />

          <PlanYearCalendar
            state={state}
            importedEvents={importedEvents}
            onSelectEvent={(eventId) => {
              setSelectedEventId(eventId);
              setSelectedImportedId(null);
            }}
            onSelectImported={(eventId) => {
              setSelectedImportedId(eventId);
              setSelectedEventId(null);
            }}
            onProposeChange={setPendingChange}
          />
        </div>

        <PlanYearContext
          key={`${effectiveSelectedEventId ?? "none"}-${selectedImportedId ?? "none"}-${state.activeStepId}`}
          state={state}
          selectedEventId={effectiveSelectedEventId}
          selectedImportedId={selectedImportedId}
          importedEvents={importedEvents}
          importedDispositions={importedDispositions}
          onProposeMeeting={handleProposeMeeting}
          onBulkUpdate={handleBulkUpdate}
          onUpdateRule={handleUpdateRule}
          onImport={importSnapshot}
          onDisposition={(eventId, value) =>
            setImportedDispositions((current) => ({ ...current, [eventId]: value }))
          }
        />
      </div>

      <footer className="app-footer">
        <span>Historical inputs: 2026 Board Calendar, LSS Meetings Calendar, Meeting Matrix, and MVP 1 Rulebook.</span>
        <strong>No Outlook connection · No autonomous calendar changes</strong>
        <button type="button" onClick={reset}>Start over</button>
      </footer>
    </main>
  );
}
