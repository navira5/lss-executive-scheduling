"use client";

import { useEffect, useMemo, useState } from "react";

import { PlanYearCalendar } from "@/app/components/PlanYearCalendar";
import { OutlookSyncReview } from "@/app/components/OutlookSyncReview";
import type { BlockedCalendarMove, PendingCalendarMove } from "@/app/components/PlanYearCalendar";
import {
  apply2027PlanningSession,
  PLANNING_SESSION_LABEL,
} from "@/data/planning-session-2027";
import {
  PlanningCockpit,
  type PendingFormatConversion,
} from "@/app/components/PlanningCockpit";
import type { CalendarImportResult, ImportedCalendarEvent } from "@/lib/calendar-import";
import { calendarIcs, confirmedCalendarEvents, downloadPlanPdf } from "@/lib/plan-export";
import {
  applyManualEventMove,
  applyPlanProposal,
  addAdHocEvent,
  addCalendarClosure,
  addLayerMeetingGroup,
  approveTemplateForPlan,
  confirmActivePhase,
  createPlanYearState,
  meetingTemplatesForState,
  navigateToPhase,
  PLAN_STEPS,
  PHASE_LABELS,
  PHASE_ORDER,
  resolvePlanEvent,
  removePlanEvent,
  removeCalendarClosure,
  recommendManualEventDate,
  updateTemplateSchedule,
  updateWorkingRule,
  visiblePlanEvents,
  type CadencePreset,
  type PlanChangeProposal,
  type PlanPhase,
  type PlanYearState,
  type WorkingMeetingRule,
} from "@/lib/plan-year";
import { toOutlookPublishInput, type OutlookSyncPreview } from "@/lib/outlook-sync";
import { generateCalendarPlan } from "@/lib/scheduling";
import type { ScenarioSettings } from "@/lib/types";

const STORAGE_KEY = "lss-plan-year-2027-v8";
const DEFAULT_SETTINGS: ScenarioSettings = {
  boardScenario: "recent_direction",
  allStaffPattern: "detailed_calendar",
};

interface StoredPlanYear {
  version: 8;
  state: PlanYearState;
  importedEvents: ImportedCalendarEvent[];
  pendingOutlookDeletionIds?: string[];
  cancelledPlannerEventIds?: string[];
  dirtyRuleTemplateIds?: string[];
}

type SourceStatus =
  | { kind: "loading"; message: string }
  | { kind: "sharepoint"; message: string }
  | { kind: "local"; message: string }
  | { kind: "fallback"; message: string }
  | { kind: "error"; message: string };

type OutlookStatus =
  | { kind: "idle"; message: string }
  | { kind: "loading"; message: string }
  | { kind: "ready"; message: string }
  | { kind: "published"; message: string }
  | { kind: "error"; message: string };

function initialState(settings: ScenarioSettings = DEFAULT_SETTINGS): PlanYearState {
  return apply2027PlanningSession(createPlanYearState(generateCalendarPlan(settings)));
}

function normalizeStoredState(state: PlanYearState): PlanYearState {
  return {
    ...state,
    customTemplates: state.customTemplates ?? [],
    calendarClosures: state.calendarClosures ?? [],
    approvedTemplateIds: state.approvedTemplateIds ?? [],
  };
}

async function fetchSharePointState(): Promise<PlanYearState> {
  const response = await fetch("/api/sharepoint-plan", {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "SharePoint rules could not be loaded.");
  }
  const payload = await response.json() as { plan?: Parameters<typeof createPlanYearState>[0] };
  if (!payload.plan) throw new Error("SharePoint response did not include a calendar plan.");
  return apply2027PlanningSession(createPlanYearState(payload.plan));
}

async function fetchLiveOutlookEvents(): Promise<ImportedCalendarEvent[]> {
  const response = await fetch("/api/outlook-events", {
    headers: { accept: "application/json" },
  });
  const payload = await response.json().catch(() => null) as { error?: string; events?: ImportedCalendarEvent[] } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Outlook events could not be loaded.");
  return payload?.events ?? [];
}

interface OutlookSyncResponse {
  error?: string;
  preview?: OutlookSyncPreview;
  count?: number;
  failed?: unknown[];
}

async function syncApprovedWithOutlook(
  state: PlanYearState,
  cancelledPlannerEventIds: string[],
  deleteOutlookEventIds: string[],
  confirm: boolean,
): Promise<OutlookSyncResponse> {
  const events = confirmedCalendarEvents(state).map(toOutlookPublishInput);
  const response = await fetch("/api/outlook-sync", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ confirm, events, cancelledPlannerEventIds, deleteOutlookEventIds }),
  });
  const payload = await response.json().catch(() => null) as OutlookSyncResponse | null;
  if (!response.ok) throw new Error(payload?.error ?? "Outlook changes could not be synchronized.");
  return payload ?? {};
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

function phaseTemplateIds(state: PlanYearState, phase: PlanPhase): Set<string> {
  return new Set(PLAN_STEPS[phase].flatMap((step) => step.templateIds));
}

export function CalendarPlanner({
  viewerName = "Local demo",
  outlookPublishEnabled = false,
  powerAppUrl = "",
}: {
  viewerName?: string;
  outlookPublishEnabled?: boolean;
  powerAppUrl?: string;
}) {
  const [state, setState] = useState<PlanYearState>(() => initialState());
  const [history, setHistory] = useState<PlanYearState[]>([]);
  const [importedEvents, setImportedEvents] = useState<ImportedCalendarEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedImportedEventId, setSelectedImportedEventId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingCalendarMove | null>(null);
  const [blockedMove, setBlockedMove] = useState<BlockedCalendarMove | null>(null);
  const [pendingConversion, setPendingConversion] = useState<PendingFormatConversion | null>(null);
  const [calendarMoveNotice, setCalendarMoveNotice] = useState<{ valid: boolean; message: string } | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [outlookStatus, setOutlookStatus] = useState<OutlookStatus>({
    kind: "idle",
    message: "Outlook sync not run",
  });
  const [outlookReview, setOutlookReview] = useState<OutlookSyncPreview | null>(null);
  const [outlookSyncBusy, setOutlookSyncBusy] = useState(false);
  const [pendingOutlookDeletionIds, setPendingOutlookDeletionIds] = useState<string[]>([]);
  const [cancelledPlannerEventIds, setCancelledPlannerEventIds] = useState<string[]>([]);
  const [dirtyRuleTemplateIds, setDirtyRuleTemplateIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasStoredPlan, setHasStoredPlan] = useState(false);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus>({
    kind: "loading",
    message: "Checking SharePoint rules",
  });

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    let loadedSavedPlan = false;
    if (saved) {
      try {
        const stored = JSON.parse(saved) as StoredPlanYear;
        if (stored.version === 8 && stored.state?.plan?.year === 2027) {
          loadedSavedPlan = true;
          queueMicrotask(() => {
            setState(normalizeStoredState(stored.state));
            setImportedEvents(stored.importedEvents ?? []);
            setPendingOutlookDeletionIds(stored.pendingOutlookDeletionIds ?? []);
            setCancelledPlannerEventIds(stored.cancelledPlannerEventIds ?? []);
            setDirtyRuleTemplateIds(stored.dirtyRuleTemplateIds ?? []);
            setSourceStatus({
              kind: "local",
              message: "Using browser-local planning state",
            });
          });
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    queueMicrotask(() => {
      setHasStoredPlan(loadedSavedPlan);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded || hasStoredPlan) return;
    let cancelled = false;
    void fetchSharePointState()
      .then((next) => {
        if (cancelled) return;
        setState(next);
        setSourceStatus({
          kind: "sharepoint",
          message: `SharePoint rules + ${PLANNING_SESSION_LABEL}`,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setSourceStatus({
          kind: error instanceof Error && /not configured/i.test(error.message) ? "fallback" : "error",
          message: error instanceof Error && /not configured/i.test(error.message)
            ? `${PLANNING_SESSION_LABEL} + built-in rules`
            : error instanceof Error ? error.message : `${PLANNING_SESSION_LABEL} + built-in rules`,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, hasStoredPlan]);

  useEffect(() => {
    if (!loaded) return;
    const stored: StoredPlanYear = {
      version: 8,
      state,
      importedEvents,
      pendingOutlookDeletionIds,
      cancelledPlannerEventIds,
      dirtyRuleTemplateIds,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [state, importedEvents, pendingOutlookDeletionIds, cancelledPlannerEventIds, dirtyRuleTemplateIds, loaded]);

  const commitState = (next: PlanYearState) => {
    setHistory((current) => [...current.slice(-29), state]);
    setState(next);
  };

  const markRuleDirty = (templateIds: string | string[]) => {
    const ids = Array.isArray(templateIds) ? templateIds : [templateIds];
    setDirtyRuleTemplateIds((current) => [...new Set([...current, ...ids])]);
  };

  const visibleEvents = useMemo(() => visiblePlanEvents(state), [state]);
  const visibleImportedEvents = importedEvents.filter(
    (event) => !event.outlookEventId || !pendingOutlookDeletionIds.includes(event.outlookEventId),
  );
  const activeIds = phaseTemplateIds(state, state.activePhase);
  const selectedStillVisible = selectedEventId
    ? visibleEvents.some((event) => event.id === selectedEventId)
    : false;
  const effectiveSelectedEventId = selectedStillVisible
    ? selectedEventId
    : visibleEvents.find((event) => activeIds.has(event.templateId))?.id ?? visibleEvents[0]?.id ?? null;
  const activeUsesGroupRoster = ["committee", "executive", "organization"].includes(state.activePhase);

  const handleCalendarMove = (eventId: string, targetDate: string) => {
    const dragged = resolvePlanEvent(state, eventId);
    const regularAtTarget = dragged.templateId === "board-retreat"
      ? visibleEvents
          .map((event) => resolvePlanEvent(state, event.id))
          .find((event) => event.templateId === "full-board" && event.date === targetDate)
      : null;
    setSelectedEventId(eventId);
    setSelectedTemplateId(dragged.templateId);
    setCalendarMoveNotice(null);
    setBlockedMove(null);
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
      const message = `${check.proposal.summary} ${check.proposal.reason ?? ""}`.trim();
      setBlockedMove({
        eventId,
        targetDate,
        message,
        recommendedDate: recommendManualEventDate(state, targetDate),
      });
      setCalendarMoveNotice({ valid: false, message });
      return;
    }
    setPendingMove({ eventId, targetDate });
    setBlockedMove(null);
    setPendingConversion(null);
  };

  const resolveMove = (choice: "rule" | "override") => {
    if (!pendingMove) return;
    if (choice === "rule") {
      const event = resolvePlanEvent(state, pendingMove.eventId);
      const weekday = new Date(`${pendingMove.targetDate}T12:00:00Z`).getUTCDay();
      commitState(updateTemplateSchedule(state, event.templateId, { weekday }));
      markRuleDirty(event.templateId);
      setCalendarMoveNotice({ valid: true, message: `${WEEKDAY_LABELS[weekday]} is now the working rule. Holiday occurrences use the recommended business day.` });
    } else {
      const result = applyManualEventMove(state, pendingMove.eventId, pendingMove.targetDate);
      if (result.proposal.valid) {
        commitState(result.state);
        setCalendarMoveNotice({ valid: true, message: `Saved as a 2027-only override for ${pendingMove.targetDate}.` });
      }
    }
    setPendingMove(null);
    setBlockedMove(null);
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
    markRuleDirty(templateId);
    if (patch.weekday !== undefined) {
      commitState(updateTemplateSchedule(state, templateId, { weekday: patch.weekday }));
      setCalendarMoveNotice({ valid: true, message: "Preferred day updated. Holiday occurrences use the recommended business day." });
      return;
    }
    commitState(updateWorkingRule(state, templateId, patch));
    setCalendarMoveNotice({ valid: true, message: "Calendar updated from the working rule." });
  };

  const importSnapshot = (result: CalendarImportResult) => {
    setImportedEvents((current) => {
      const byId = new Map(current.map((event) => [event.id, event]));
      for (const event of result.events) byId.set(event.id, event);
      return [...byId.values()];
    });
  };

  const loadLiveOutlook = async () => {
    setOutlookStatus({ kind: "loading", message: "Loading Outlook events" });
    try {
      const events = await fetchLiveOutlookEvents();
      setImportedEvents((current) => [
        ...current.filter((event) => event.sourceLabel !== "Live Outlook"),
        ...events,
      ]);
      setOutlookStatus({
        kind: "ready",
        message: `Loaded ${events.length} Outlook event${events.length === 1 ? "" : "s"}`,
      });
      setCalendarMoveNotice({
        valid: true,
        message: `Retrieved ${events.length} existing Outlook event${events.length === 1 ? "" : "s"} before planning.`,
      });
    } catch (error) {
      setOutlookStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Outlook events could not be loaded.",
      });
    }
  };

  const reviewOutlookChanges = async () => {
    setOutlookStatus({ kind: "loading", message: "Comparing the approved plan with Outlook" });
    try {
      const result = await syncApprovedWithOutlook(state, cancelledPlannerEventIds, pendingOutlookDeletionIds, false);
      if (!result.preview) throw new Error("Outlook did not return a change review.");
      setOutlookReview(result.preview);
      setOutlookStatus({
        kind: "ready",
        message: `${result.preview.changes.length} Outlook change${result.preview.changes.length === 1 ? "" : "s"} ready for review`,
      });
    } catch (error) {
      setOutlookStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Outlook changes could not be reviewed.",
      });
    }
  };

  const uploadOutlookChanges = async () => {
    setOutlookSyncBusy(true);
    setOutlookStatus({ kind: "loading", message: "Uploading approved changes to Outlook" });
    try {
      const result = await syncApprovedWithOutlook(state, cancelledPlannerEventIds, pendingOutlookDeletionIds, true);
      const failed = result.failed?.length ?? 0;
      if (failed) throw new Error(`${failed} Outlook change${failed === 1 ? "" : "s"} failed. No failed item was hidden.`);
      setPendingOutlookDeletionIds([]);
      setCancelledPlannerEventIds([]);
      setOutlookReview(null);
      setOutlookStatus({ kind: "published", message: `Uploaded ${result.count ?? 0} approved change${result.count === 1 ? "" : "s"} to Outlook` });
      setCalendarMoveNotice({ valid: true, message: `Outlook is current. ${result.count ?? 0} approved change${result.count === 1 ? "" : "s"} applied.` });
      const events = await fetchLiveOutlookEvents();
      setImportedEvents((current) => [...current.filter((event) => event.sourceLabel !== "Live Outlook"), ...events]);
    } catch (error) {
      setOutlookStatus({ kind: "error", message: error instanceof Error ? error.message : "Outlook upload failed." });
    } finally {
      setOutlookSyncBusy(false);
    }
  };

  const loadSharePointRules = async () => {
    setSourceStatus({ kind: "loading", message: "Loading SharePoint rules" });
    try {
      const next = await fetchSharePointState();
      commitState(next);
      setImportedEvents([]);
      setSelectedEventId(null);
      setSelectedTemplateId(null);
      setSelectedImportedEventId(null);
      setPendingMove(null);
      setBlockedMove(null);
      setPendingConversion(null);
      setDirtyRuleTemplateIds([]);
      setCancelledPlannerEventIds([]);
      setCalendarMoveNotice({ valid: true, message: `SharePoint rules refreshed; ${PLANNING_SESSION_LABEL} preserved.` });
      setSourceStatus({ kind: "sharepoint", message: `SharePoint rules + ${PLANNING_SESSION_LABEL}` });
    } catch (error) {
      setSourceStatus({
        kind: error instanceof Error && /not configured/i.test(error.message) ? "fallback" : "error",
        message: error instanceof Error ? error.message : "SharePoint rules could not be loaded.",
      });
    }
  };

  const saveConfirmedRulesToSharePoint = async (): Promise<boolean> => {
    if (state.activePhase === "review") return true;
    const templates = meetingTemplatesForState(state);
    const rules = dirtyRuleTemplateIds
      .map((templateId) => {
        const template = templates.find((item) => item.id === templateId);
        if (!template || template.category !== state.activePhase) return null;
        return { template, rule: state.workingRules[templateId] ?? {} };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (!rules.length) return true;
    setSourceStatus({ kind: "loading", message: "Saving confirmed rules to SharePoint" });
    try {
      const response = await fetch("/api/sharepoint-rules", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ confirm: true, rules }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; permission?: string; count?: number } | null;
      if (!response.ok) throw new Error([payload?.error, payload?.permission].filter(Boolean).join(" ") || "Confirmed rules could not be saved to SharePoint.");
      const savedIds = new Set(rules.map((item) => item.template.id));
      setDirtyRuleTemplateIds((current) => current.filter((id) => !savedIds.has(id)));
      setSourceStatus({ kind: "sharepoint", message: `Saved ${payload?.count ?? rules.length} confirmed rule${rules.length === 1 ? "" : "s"} to SharePoint` });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Confirmed rules could not be saved to SharePoint.";
      setSourceStatus({ kind: "error", message });
      setCalendarMoveNotice({ valid: false, message });
      return false;
    }
  };

  const confirmPhaseAndSyncRules = async () => {
    if (!await saveConfirmedRulesToSharePoint()) return;
    commitState(confirmActivePhase(state));
    setSelectedEventId(null);
    setSelectedTemplateId(null);
    setPendingMove(null);
    setBlockedMove(null);
    setPendingConversion(null);
  };

  const deletePlanMeeting = (eventId: string) => {
    const event = resolvePlanEvent(state, eventId);
    if (!window.confirm(`Remove ${event.title} on ${event.date} from the 2027 plan? If it already exists in the demo Outlook calendar, the deletion will appear in Outlook Change Review.`)) return;
    commitState(removePlanEvent(state, eventId));
    setCancelledPlannerEventIds((current) => [...new Set([...current, eventId])]);
    setSelectedEventId(null);
    setSelectedTemplateId(null);
    setCalendarMoveNotice({ valid: true, message: `${event.title} removed from the plan. Review Outlook changes before deleting any published copy.` });
  };

  const deleteImportedOutlookMeeting = (event: ImportedCalendarEvent) => {
    const liveOutlook = Boolean(event.outlookEventId);
    const message = liveOutlook
      ? `Queue “${event.title}” on ${event.date} for deletion from the dedicated demo Outlook calendar? Nothing is deleted until Outlook Change Review is uploaded.`
      : `Remove “${event.title}” on ${event.date} from this browser-local Outlook snapshot? This cannot change the source Outlook calendar.`;
    if (!window.confirm(message)) return;
    if (event.outlookEventId) {
      setPendingOutlookDeletionIds((current) => [...new Set([...current, event.outlookEventId as string])]);
    } else {
      setImportedEvents((current) => current.filter((candidate) => candidate.id !== event.id));
    }
    setSelectedImportedEventId(null);
    setCalendarMoveNotice({
      valid: true,
      message: liveOutlook
        ? `${event.title} is queued for Outlook deletion. Review and upload changes to apply it.`
        : `${event.title} was removed from this browser-local snapshot. The source Outlook calendar was not changed.`,
    });
  };

  const reset = () => {
    if (!window.confirm("Start Plan Year over? This clears browser-local planning changes and imported snapshots.")) return;
    setState(initialState());
    setHistory([]);
    setImportedEvents([]);
    setSelectedEventId(null);
    setSelectedTemplateId(null);
    setSelectedImportedEventId(null);
    setPendingMove(null);
    setBlockedMove(null);
    setPendingConversion(null);
    setCalendarMoveNotice(null);
    setOutlookReview(null);
    setPendingOutlookDeletionIds([]);
    setCancelledPlannerEventIds([]);
    setDirtyRuleTemplateIds([]);
    window.localStorage.removeItem(STORAGE_KEY);
    setHasStoredPlan(false);
    setSourceStatus({ kind: "fallback", message: `${PLANNING_SESSION_LABEL} + built-in rules` });
    setOutlookStatus({ kind: "idle", message: "Outlook sync not run" });
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
          <button className="button ghost" type="button" disabled={sourceStatus.kind === "loading"} onClick={() => void loadSharePointRules()}>
            {sourceStatus.kind === "loading" ? "Loading Rules" : "Load SharePoint Rules"}
          </button>
          <button className="button ghost" type="button" disabled={outlookStatus.kind === "loading"} onClick={() => void loadLiveOutlook()}>
            {outlookStatus.kind === "loading" ? "Syncing Outlook" : "Sync Existing Outlook"}
          </button>
          <button
            className="button primary"
            type="button"
            disabled={outlookStatus.kind === "loading" || !outlookPublishEnabled}
            title={outlookPublishEnabled ? "Review creates, updates, and deletions before changing the demo calendar" : "Outlook uploading is locked"}
            onClick={() => void reviewOutlookChanges()}
          >
            {outlookPublishEnabled ? "Review Outlook Changes" : "Outlook Upload Locked"}
          </button>
          <button className="button ghost" type="button" disabled={pdfBusy} onClick={async () => {
            setPdfBusy(true);
            try {
              await downloadPlanPdf(state, visibleImportedEvents);
            } finally {
              setPdfBusy(false);
            }
          }}>{pdfBusy ? "Preparing PDF…" : "Download PDF"}</button>
          <button className="button secondary" type="button" onClick={() => {
            const exported = calendarIcs(state);
            if (!exported.count) {
              window.alert("No meetings are ready for the calendar file yet. Confirm a planning layer first; unresolved meetings remain in the PDF only.");
              return;
            }
            download("LSS-2027-Confirmed-Meetings.ics", exported.contents);
            setCalendarMoveNotice({ valid: true, message: `Downloaded ${exported.count} confirmed meetings. Working and unresolved placements were excluded.` });
          }}>Download Calendar File</button>
        </div>
      </header>

      <section className="scope-banner tester-scope-banner">
        <div>
          <strong>Private feedback workspace</strong>
          <span>Signed in as {viewerName} · changes save only in this browser</span>
        </div>
        <span>SharePoint rules + dedicated demo Outlook calendar</span>
      </section>

      <section className={`scope-banner data-source-banner ${sourceStatus.kind}`}>
        <div>
          <strong>Data source</strong>
          <span>{sourceStatus.message}</span>
        </div>
        {powerAppUrl ? (
          <a href={powerAppUrl} target="_blank" rel="noreferrer">Open Power Apps rule editor</a>
        ) : (
          <span>Rules managed through SharePoint / Power Apps</span>
        )}
      </section>

      <section className={`scope-banner outlook-sync-banner ${outlookStatus.kind}`}>
        <div>
          <strong>Outlook sync</strong>
          <span>{outlookStatus.message}</span>
        </div>
        <span>Read before planning · publish after human approval</span>
      </section>

      <nav className="phase-progress" aria-label="Plan Year stages">
        <div className="phase-progress-inner">
          <div className="phase-progress-summary">
            <span>Plan Year</span>
            <strong>{confirmedCount} of 4 layers confirmed</strong>
          </div>
          <div className="phase-progress-list">
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
                    setSelectedTemplateId(null);
                    setPendingMove(null);
                    setBlockedMove(null);
                    setPendingConversion(null);
                  }}
                >
                  <i>{confirmed ? "✓" : index + 1}</i>
                  <span><strong>{PHASE_LABELS[phase]}</strong><small>{active ? "Planning now" : confirmed ? "Confirmed" : unavailable ? "Follows prior stage" : "Ready"}</small></span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className={`plan-layout cockpit-layout${detailsCollapsed ? " details-collapsed" : ""}`}>

        <div className="planning-canvas calendar-canvas">
          <PlanYearCalendar
            state={state}
            importedEvents={visibleImportedEvents}
            selectedEventId={activeUsesGroupRoster && !selectedTemplateId ? null : effectiveSelectedEventId}
            moveNotice={calendarMoveNotice}
            previewMove={pendingMove}
            blockedMove={blockedMove}
            onSelectEvent={(eventId) => {
              setSelectedEventId(eventId);
              setSelectedTemplateId(state.plan.events.find((event) => event.id === eventId)?.templateId ?? null);
              setSelectedImportedEventId(null);
              setDetailsCollapsed(false);
            }}
            onSelectImported={(eventId) => {
              setSelectedImportedEventId(eventId);
              setDetailsCollapsed(false);
              setCalendarMoveNotice({ valid: true, message: "Existing Outlook meeting selected. Details are open at right." });
            }}
            onDeleteEvent={deletePlanMeeting}
            onDeleteImported={deleteImportedOutlookMeeting}
            onMoveEvent={handleCalendarMove}
            onResolveMove={resolveMove}
            onCancelMove={() => {
              setPendingMove(null);
              setBlockedMove(null);
            }}
            onUseRecommendedMove={() => {
              if (!blockedMove?.recommendedDate) return;
              handleCalendarMove(blockedMove.eventId, blockedMove.recommendedDate);
            }}
            onDismissBlockedMove={() => setBlockedMove(null)}
            onCloseDate={(date, label) => {
              try {
                commitState(addCalendarClosure(state, date, label));
                setCalendarMoveNotice({ valid: true, message: `${label.trim() || "LSS closure"} now blocks ${date}.` });
              } catch (error) {
                setCalendarMoveNotice({ valid: false, message: error instanceof Error ? error.message : "The date could not be closed." });
              }
            }}
            onRemoveClosure={(date) => {
              commitState(removeCalendarClosure(state, date));
              setCalendarMoveNotice({ valid: true, message: `Closure removed from ${date}.` });
            }}
            onAddAdHoc={(date, title) => {
              try {
                const added = addAdHocEvent(
                  state,
                  date,
                  title,
                  state.activePhase === "review" ? "organization" : state.activePhase,
                );
                commitState(added.state);
                setSelectedTemplateId(added.templateId);
                setSelectedEventId(added.eventId);
                setSelectedImportedEventId(null);
                setDetailsCollapsed(false);
                setCalendarMoveNotice({ valid: true, message: `${title} added on ${date}. Complete details in the meeting cockpit.` });
              } catch (error) {
                setCalendarMoveNotice({ valid: false, message: error instanceof Error ? error.message : "The event could not be added." });
              }
            }}
          />
        </div>

        <PlanningCockpit
          key={`${selectedTemplateId ?? effectiveSelectedEventId ?? "none"}-${state.activePhase}`}
          state={state}
          selectedEventId={effectiveSelectedEventId}
          selectedTemplateId={selectedTemplateId}
          pendingConversion={pendingConversion}
          importedEvents={visibleImportedEvents}
          selectedImportedEventId={selectedImportedEventId}
          canUndo={history.length > 0}
          collapsed={detailsCollapsed}
          onToggleCollapsed={() => setDetailsCollapsed((current) => !current)}
          onRuleChange={updateRule}
          onOpenMeetingGroup={(templateId) => {
            setSelectedTemplateId(templateId);
            setSelectedEventId(state.plan.events.find((event) => event.templateId === templateId)?.id ?? null);
            setSelectedImportedEventId(null);
          }}
          onBackToMeetingGroups={() => {
            setSelectedTemplateId(null);
            setSelectedEventId(null);
          }}
          onAddMeetingGroup={(name, attendees) => {
            if (!["committee", "executive", "organization"].includes(state.activePhase)) return;
            const added = addLayerMeetingGroup(state, {
              name,
              attendees,
              phase: state.activePhase as "committee" | "executive" | "organization",
            });
            commitState(added.state);
            markRuleDirty(added.templateId);
            setSelectedTemplateId(added.templateId);
            setSelectedEventId(null);
            setCalendarMoveNotice({ valid: true, message: `${name} added without inventing a cadence. Choose a schedule when ready.` });
          }}
          onApproveTemplateForPlan={(templateId) => {
            commitState(approveTemplateForPlan(state, templateId));
            setCalendarMoveNotice({ valid: true, message: "This 2027 meeting plan is ready for calendar export; the underlying source-rule status remains unchanged." });
          }}
          onSharedAttendeesChange={(templateIds, attendees) => {
            let next = state;
            for (const templateId of templateIds) {
              next = updateWorkingRule(next, templateId, { attendees });
            }
            commitState(next);
            markRuleDirty(templateIds);
            setCalendarMoveNotice({ valid: true, message: "Shared attendees updated for this meeting group." });
          }}
          onScheduleChange={(templateId, patch: { cadencePreset?: CadencePreset; annualCount?: number; startMonth?: number; ordinal?: number; weekday?: number }) => {
            commitState(updateTemplateSchedule(state, templateId, patch));
            markRuleDirty(templateId);
            setCalendarMoveNotice({ valid: true, message: "Calendar regenerated from the updated cadence." });
          }}
          onApplyConversion={applyConversion}
          onCancelConversion={() => setPendingConversion(null)}
          onUndo={() => {
            const previous = history.at(-1);
            if (!previous) return;
            setState(previous);
            setHistory((current) => current.slice(0, -1));
            setPendingMove(null);
            setBlockedMove(null);
            setPendingConversion(null);
            setCalendarMoveNotice({ valid: true, message: "Last change undone." });
          }}
          onConfirmPhase={() => void confirmPhaseAndSyncRules()}
          onImport={importSnapshot}
          onDeletePlanEvent={deletePlanMeeting}
          onDeleteImportedEvent={deleteImportedOutlookMeeting}
        />
      </div>

      {outlookReview && (
        <OutlookSyncReview
          preview={outlookReview}
          busy={outlookSyncBusy}
          onClose={() => setOutlookReview(null)}
          onPublish={() => void uploadOutlookChanges()}
        />
      )}

      <footer className="app-footer">
        <span>Historical evidence remains separate from 2027 working rules and one-year overrides.</span>
        <strong>{outlookPublishEnabled ? "Outlook changes require review and confirmation" : "Demo Outlook uploading is locked"}</strong>
        <a href="/api/demo-logout">Sign out</a>
        <button type="button" onClick={reset}>Start over</button>
      </footer>
    </main>
  );
}

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
