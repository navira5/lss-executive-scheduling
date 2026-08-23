"use client";

import { useEffect, useMemo, useState } from "react";

import { PlanYearCalendar } from "@/app/components/PlanYearCalendar";
import {
  PlanningCockpit,
  type PendingCalendarMove,
  type PendingFormatConversion,
} from "@/app/components/PlanningCockpit";
import type { CalendarImportResult, ImportedCalendarEvent } from "@/lib/calendar-import";
import {
  applyManualEventMove,
  applyPlanProposal,
  confirmActivePhase,
  createPlanYearState,
  navigateToPhase,
  PLAN_STEPS,
  PHASE_LABELS,
  PHASE_ORDER,
  resolvePlanEvent,
  updateTemplateSchedule,
  updateWorkingRule,
  visiblePlanEvents,
  type CadencePreset,
  type PlanChangeProposal,
  type PlanPhase,
  type PlanYearState,
  type WorkingMeetingRule,
} from "@/lib/plan-year";
import { generateCalendarPlan } from "@/lib/scheduling";
import type { ScenarioSettings } from "@/lib/types";

const STORAGE_KEY = "lss-plan-year-2027-v3";
const DEFAULT_SETTINGS: ScenarioSettings = {
  boardScenario: "recent_direction",
  allStaffPattern: "detailed_calendar",
};

interface StoredPlanYear {
  version: 3;
  state: PlanYearState;
  importedEvents: ImportedCalendarEvent[];
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
  const rows = state.plan.events
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
        state.eventOverrides[event.id]?.date ? "2027 override" : "Plan Year rule",
      ];
    });
  const imported = importedEvents.map((event) => [
    event.date,
    event.startTime ?? "All day",
    event.durationMinutes,
    event.title,
    "Existing Outlook",
    event.location ?? "",
    event.attendees?.join("; ") ?? "",
    event.sourceLabel,
  ]);
  return [
    ["Date", "Time", "Duration", "Meeting", "Category", "Location", "Attendees", "Source"],
    ...rows,
    ...imported,
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function phaseTemplateIds(state: PlanYearState, phase: PlanPhase): Set<string> {
  return new Set(PLAN_STEPS[phase].flatMap((step) => step.templateIds));
}

function ruleHolidayConflict(
  state: PlanYearState,
  templateId: string,
  patch: WorkingMeetingRule,
): { next: PlanYearState; message: string | null } {
  const next = updateWorkingRule(state, templateId, patch);
  if (patch.weekday === undefined) return { next, message: null };
  const conflict = next.plan.events
    .filter((event) => event.templateId === templateId && !event.isPlaceholder)
    .map((event) => resolvePlanEvent(next, event.id))
    .find((event) =>
      next.plan.holidays.some(
        (holiday) => holiday.status === "verified_federal" && holiday.date === event.date,
      ),
    );
  if (!conflict) return { next, message: null };
  const holiday = next.plan.holidays.find((item) => item.date === conflict.date);
  return {
    next: state,
    message: `${conflict.title} would land on ${holiday?.name ?? "a federal holiday"}. Choose another preferred day.`,
  };
}

export function CalendarPlanner() {
  const [state, setState] = useState<PlanYearState>(() => initialState());
  const [history, setHistory] = useState<PlanYearState[]>([]);
  const [importedEvents, setImportedEvents] = useState<ImportedCalendarEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedImportedEventId, setSelectedImportedEventId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingCalendarMove | null>(null);
  const [pendingConversion, setPendingConversion] = useState<PendingFormatConversion | null>(null);
  const [calendarMoveNotice, setCalendarMoveNotice] = useState<{ valid: boolean; message: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const stored = JSON.parse(saved) as StoredPlanYear;
        if (stored.version === 3 && stored.state?.plan?.year === 2027) {
          queueMicrotask(() => {
            setState(stored.state);
            setImportedEvents(stored.importedEvents ?? []);
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
    const stored: StoredPlanYear = { version: 3, state, importedEvents };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [state, importedEvents, loaded]);

  const commitState = (next: PlanYearState) => {
    setHistory((current) => [...current.slice(-29), state]);
    setState(next);
  };

  const visibleEvents = useMemo(() => visiblePlanEvents(state), [state]);
  const activeIds = phaseTemplateIds(state, state.activePhase);
  const selectedStillVisible = selectedEventId
    ? visibleEvents.some((event) => event.id === selectedEventId)
    : false;
  const effectiveSelectedEventId = selectedStillVisible
    ? selectedEventId
    : visibleEvents.find((event) => activeIds.has(event.templateId))?.id ?? visibleEvents[0]?.id ?? null;

  const handleCalendarMove = (eventId: string, targetDate: string) => {
    const dragged = resolvePlanEvent(state, eventId);
    const regularAtTarget = dragged.templateId === "board-retreat"
      ? visibleEvents
          .map((event) => resolvePlanEvent(state, event.id))
          .find((event) => event.templateId === "full-board" && event.date === targetDate)
      : null;
    setSelectedEventId(eventId);
    setCalendarMoveNotice(null);
    if (regularAtTarget) {
      setPendingConversion({
        retreatEventId: eventId,
        regularEventId: regularAtTarget.id,
        targetDate,
      });
      setPendingMove(null);
      return;
    }
    const check = applyManualEventMove(state, eventId, targetDate);
    if (!check.proposal.valid) {
      setCalendarMoveNotice({ valid: false, message: check.proposal.reason ?? check.proposal.summary });
      return;
    }
    setPendingMove({ eventId, targetDate });
    setPendingConversion(null);
  };

  const resolveMove = (choice: "rule" | "override") => {
    if (!pendingMove) return;
    if (choice === "rule") {
      const event = resolvePlanEvent(state, pendingMove.eventId);
      const weekday = new Date(`${pendingMove.targetDate}T12:00:00Z`).getUTCDay();
      const result = ruleHolidayConflict(state, event.templateId, { weekday });
      if (result.message) {
        setCalendarMoveNotice({ valid: false, message: result.message });
        setPendingMove(null);
        return;
      }
      commitState(result.next);
      setCalendarMoveNotice({ valid: true, message: `${WEEKDAY_LABELS[weekday]} is now the working rule for this meeting type.` });
    } else {
      const result = applyManualEventMove(state, pendingMove.eventId, pendingMove.targetDate);
      if (result.proposal.valid) {
        commitState(result.state);
        setCalendarMoveNotice({ valid: true, message: `Saved as a 2027-only override for ${pendingMove.targetDate}.` });
      }
    }
    setPendingMove(null);
  };

  const applyConversion = () => {
    if (!pendingConversion) return;
    const retreat = resolvePlanEvent(state, pendingConversion.retreatEventId);
    const proposal: PlanChangeProposal = {
      valid: true,
      summary: "Convert the regular Board slot to a retreat.",
      changes: [
        { eventId: pendingConversion.retreatEventId, patch: { date: pendingConversion.targetDate } },
        { eventId: pendingConversion.regularEventId, patch: { date: retreat.date } },
      ],
    };
    commitState(applyPlanProposal(state, proposal));
    setPendingConversion(null);
    setCalendarMoveNotice({ valid: true, message: "Regular meeting and retreat formats were exchanged." });
  };

  const updateRule = (templateId: string, patch: WorkingMeetingRule) => {
    const result = ruleHolidayConflict(state, templateId, patch);
    if (result.message) {
      setCalendarMoveNotice({ valid: false, message: result.message });
      return;
    }
    commitState(result.next);
    setCalendarMoveNotice({ valid: true, message: "Calendar updated from the working rule." });
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
    setHistory([]);
    setImportedEvents([]);
    setSelectedEventId(null);
    setSelectedImportedEventId(null);
    setPendingMove(null);
    setPendingConversion(null);
    setCalendarMoveNotice(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const activePhaseIndex = PHASE_ORDER.indexOf(state.activePhase);
  const confirmedCount = state.confirmedPhases.length;
  const maxAvailablePhase = Math.min(
    Math.max(activePhaseIndex, confirmedCount),
    PHASE_ORDER.length - 1,
  );

  return (
    <main className="plan-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">LSS</div>
          <div><p className="eyebrow">Annual calendar planning</p><h1>Plan Year 2027</h1></div>
        </div>
        <div className="header-status">
          <span><i /> Changes apply live · undo available</span>
          <strong>{confirmedCount} layers confirmed</strong>
        </div>
        <div className="header-actions">
          <button className="button ghost" type="button" onClick={() => window.print()}>Print</button>
          <button className="button secondary" type="button" onClick={() => download("lss-plan-year-2027.csv", workingCsv(state, importedEvents))}>Export CSV</button>
        </div>
      </header>

      <div className="plan-layout cockpit-layout">
        <nav className="phase-rail" aria-label="Plan Year layers">
          <div className="phase-rail-heading"><span>Plan Year</span><strong>{Math.round((confirmedCount / 3) * 100)}%</strong></div>
          <div className="phase-list">
            {PHASE_ORDER.map((phase, index) => {
              const confirmed = state.confirmedPhases.includes(phase);
              const active = state.activePhase === phase;
              const unavailable = index > maxAvailablePhase;
              return (
                <button
                  type="button"
                  className={`${active ? "active" : ""}${confirmed ? " confirmed" : ""}`}
                  key={phase}
                  disabled={unavailable || active}
                  onClick={() => {
                    setState((current) => navigateToPhase(current, phase));
                    setSelectedEventId(null);
                    setPendingMove(null);
                    setPendingConversion(null);
                  }}
                >
                  <i>{confirmed ? "✓" : index + 1}</i>
                  <span><strong>{PHASE_LABELS[phase]}</strong><small>{active ? "Shaping now" : confirmed ? "Confirmed · revisit" : unavailable ? "Follows prior layer" : "Ready"}</small></span>
                </button>
              );
            })}
          </div>
          <div className="phase-help"><strong>Immovable rocks first</strong><p>Earlier layers stay visible. Revisit them at any time; downstream effects will be surfaced here.</p></div>
        </nav>

        <div className="planning-canvas calendar-canvas">
          <PlanYearCalendar
            state={state}
            importedEvents={importedEvents}
            selectedEventId={effectiveSelectedEventId}
            moveNotice={calendarMoveNotice}
            onSelectEvent={(eventId) => {
              setSelectedEventId(eventId);
              setSelectedImportedEventId(null);
            }}
            onSelectImported={(eventId) => {
              setSelectedImportedEventId(eventId);
              setCalendarMoveNotice({ valid: true, message: "Existing Outlook meeting selected. Details are open at right." });
            }}
            onMoveEvent={handleCalendarMove}
          />
        </div>

        <PlanningCockpit
          key={`${effectiveSelectedEventId ?? "none"}-${state.activePhase}`}
          state={state}
          selectedEventId={effectiveSelectedEventId}
          pendingMove={pendingMove}
          pendingConversion={pendingConversion}
          importedEvents={importedEvents}
          selectedImportedEventId={selectedImportedEventId}
          canUndo={history.length > 0}
          onRuleChange={updateRule}
          onSharedAttendeesChange={(templateIds, attendees) => {
            let next = state;
            for (const templateId of templateIds) {
              next = updateWorkingRule(next, templateId, { attendees });
            }
            commitState(next);
            setCalendarMoveNotice({ valid: true, message: "Shared attendees updated for this meeting group." });
          }}
          onScheduleChange={(templateId, patch: { cadencePreset?: CadencePreset; annualCount?: number }) => {
            commitState(updateTemplateSchedule(state, templateId, patch));
            setCalendarMoveNotice({ valid: true, message: "Calendar regenerated from the updated cadence." });
          }}
          onResolveMove={resolveMove}
          onCancelMove={() => setPendingMove(null)}
          onApplyConversion={applyConversion}
          onCancelConversion={() => setPendingConversion(null)}
          onUndo={() => {
            const previous = history.at(-1);
            if (!previous) return;
            setState(previous);
            setHistory((current) => current.slice(0, -1));
            setPendingMove(null);
            setPendingConversion(null);
            setCalendarMoveNotice({ valid: true, message: "Last change undone." });
          }}
          onConfirmPhase={() => {
            commitState(confirmActivePhase(state));
            setSelectedEventId(null);
            setPendingMove(null);
            setPendingConversion(null);
          }}
          onImport={importSnapshot}
        />
      </div>

      <footer className="app-footer">
        <span>Historical evidence remains separate from 2027 working rules and one-year overrides.</span>
        <strong>No Outlook writes · Human confirmation required</strong>
        <button type="button" onClick={reset}>Start over</button>
      </footer>
    </main>
  );
}

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
