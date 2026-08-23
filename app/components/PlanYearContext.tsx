"use client";

import { useState } from "react";

import { buildMeetingTemplates } from "@/data/source-data";
import {
  parseCalendarSnapshot,
  type CalendarImportResult,
  type ImportedCalendarEvent,
} from "@/lib/calendar-import";
import {
  resolvePlanEvent,
  type PlanEventOverride,
  type PlanYearState,
  type WorkingMeetingRule,
} from "@/lib/plan-year";
import { ruleSummaryFor } from "@/lib/rule-summaries";
import type { MeetingTemplate } from "@/lib/types";

type ContextTab = "meeting" | "rules" | "attendees" | "outlook";
type ImportedDisposition = "unresolved" | "kept" | "adopted" | "override";

function list(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

interface MeetingEditorProps {
  state: PlanYearState;
  eventId: string;
  onProposeMeeting: (eventId: string, patch: PlanEventOverride) => void;
  onBulkUpdate: (exactTitle: string, patch: PlanEventOverride) => void;
}

function MeetingEditor({
  state,
  eventId,
  onProposeMeeting,
  onBulkUpdate,
}: MeetingEditorProps) {
  const event = resolvePlanEvent(state, eventId);
  const [title, setTitle] = useState(event.title);
  const [message, setMessage] = useState(event.message);
  const [date, setDate] = useState(event.date);
  const [startTime, setStartTime] = useState(event.startTime ?? "");
  const [duration, setDuration] = useState(String(event.durationMinutes));
  const [location, setLocation] = useState(event.location);
  const [modality, setModality] = useState(event.modality);
  const patch = (): PlanEventOverride => ({
    title,
    message,
    date,
    startTime: startTime || null,
    durationMinutes: Number(duration) || event.durationMinutes,
    location,
    modality,
  });

  return (
    <div className="context-form">
      <div className="context-intro">
        <span className={`meeting-type-pill ${event.category}`}>{event.category}</span>
        <span className={`rule-pill ${event.ruleStatus}`}>{event.ruleStatus.replaceAll("_", " ")}</span>
        {event.locked && <span className="lock-pill">Locked anchor</span>}
      </div>
      <label><span>Meeting title</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="wide"><span>Meeting message</span><textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      <div className="form-row">
        <label><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span>Start time</span><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
      </div>
      <div className="form-row">
        <label><span>Duration</span><input type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
        <label><span>Format</span><input value={modality} onChange={(e) => setModality(e.target.value)} /></label>
      </div>
      <label><span>Location</span><input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
      <button
        className="button primary full"
        type="button"
        disabled={event.locked}
        onClick={() => onProposeMeeting(eventId, patch())}
      >
        Review meeting changes
      </button>
      <button
        className="button secondary full"
        type="button"
        disabled={event.locked}
        onClick={() => onBulkUpdate(event.title, { title, message })}
      >
        Bulk update exact title &amp; message
      </button>
      <small className="field-note">
        Bulk update key: “{event.title}”. Meetings with a different custom title are excluded.
      </small>
    </div>
  );
}

interface RuleEditorProps {
  state: PlanYearState;
  templateId: string;
  attendeesOnly?: boolean;
  onUpdateRule: (templateId: string, rule: WorkingMeetingRule) => void;
}

function RuleEditor(props: RuleEditorProps) {
  const template = buildMeetingTemplates(props.state.plan.settings).find(
    (item) => item.id === props.templateId,
  );
  if (!template) return <p className="empty-context">Select a meeting to view its rules.</p>;
  return <RuleEditorForm {...props} template={template} />;
}

interface RuleEditorFormProps extends RuleEditorProps {
  template: MeetingTemplate;
}

function RuleEditorForm({
  state,
  templateId,
  template,
  attendeesOnly = false,
  onUpdateRule,
}: RuleEditorFormProps) {
  const override = state.workingRules[templateId] ?? {};
  const [cadence, setCadence] = useState(override.cadence ?? template.cadence);
  const [startTime, setStartTime] = useState(override.startTime ?? template.startTime ?? "");
  const [duration, setDuration] = useState(String(override.durationMinutes ?? template.durationMinutes));
  const [location, setLocation] = useState(override.location ?? template.location);
  const [modality, setModality] = useState(override.modality ?? template.modality);
  const [attendees, setAttendees] = useState(
    (override.attendees ?? [template.attendeeGroup]).join("\n"),
  );
  const [distributionLists, setDistributionLists] = useState(
    (override.distributionLists ?? []).join("\n"),
  );
  const [saved, setSaved] = useState(false);
  const summary = ruleSummaryFor(template);

  const saveAttendees = () => {
    onUpdateRule(templateId, {
      attendees: list(attendees),
      distributionLists: list(distributionLists),
    });
    setSaved(true);
  };

  const saveSchedulingRule = () => {
    onUpdateRule(templateId, {
      cadence,
      startTime: startTime || null,
      durationMinutes: Number(duration) || template.durationMinutes,
      location,
      modality,
    });
    setSaved(true);
  };

  if (attendeesOnly) {
    return (
      <div className="context-form">
        <div className="rule-summary">
          <strong>{template.name}</strong>
          <span>Role-based group: {template.attendeeGroup}</span>
        </div>
        <label className="wide"><span>Attendees or role groups</span><textarea rows={6} value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="One person, role, or group per line" /></label>
        <label className="wide"><span>Distribution lists</span><textarea rows={4} value={distributionLists} onChange={(e) => setDistributionLists(e.target.value)} placeholder="One distribution list per line" /></label>
        <button className="button primary full" type="button" onClick={saveAttendees}>Save attendees to working rule</button>
        {saved && <div className="save-receipt">Saved to this working plan</div>}
        <small className="field-note">Names remain working planning data. This does not update Outlook or Microsoft 365 groups.</small>
      </div>
    );
  }

  return (
    <div className="context-form rule-context-form">
      <section className="rule-profile" aria-label={`${summary.title} scheduling rules`}>
        <header>
          <div>
            <span>Selected meeting type</span>
            <h3>{summary.title}</h3>
          </div>
          <span className={`rule-pill ${template.ruleStatus}`}>{template.ruleStatus.replaceAll("_", " ")}</span>
        </header>
        <dl>
          {summary.rows.map((row) => (
            <div className={row.emphasis ? `rule-row ${row.emphasis}` : "rule-row"} key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <details className="working-rule-editor">
        <summary>Update 2027 working settings</summary>
        <div className="working-rule-fields">
          <label><span>Working cadence</span><input value={cadence} onChange={(e) => { setCadence(e.target.value); setSaved(false); }} /></label>
          <div className="form-row">
            <label><span>Start time</span><input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setSaved(false); }} /></label>
            <label><span>Duration</span><input type="number" min="15" step="15" value={duration} onChange={(e) => { setDuration(e.target.value); setSaved(false); }} /></label>
          </div>
          <div className="form-row">
            <label><span>Format</span><input value={modality} onChange={(e) => { setModality(e.target.value); setSaved(false); }} /></label>
            <label><span>Location</span><input value={location} onChange={(e) => { setLocation(e.target.value); setSaved(false); }} /></label>
          </div>
          <button className="button primary full" type="button" onClick={saveSchedulingRule}>Save to working plan</button>
          {saved && <div className="save-receipt">Saved without changing source-rule authority</div>}
        </div>
      </details>
      <details className="source-evidence">
        <summary>View source evidence</summary>
        {template.sourceReferences.map((source) => (
          <p key={`${source.label}-${source.detail}`}><strong>{source.label}</strong><br />{source.detail}</p>
        ))}
      </details>
    </div>
  );
}

interface OutlookPanelProps {
  importedEvents: ImportedCalendarEvent[];
  selectedImportedId: string | null;
  importedDispositions: Record<string, ImportedDisposition>;
  onImport: (result: CalendarImportResult) => void;
  onDisposition: (eventId: string, value: ImportedDisposition) => void;
}

function OutlookPanel({
  importedEvents,
  selectedImportedId,
  importedDispositions,
  onImport,
  onDisposition,
}: OutlookPanelProps) {
  const [sourceLabel, setSourceLabel] = useState("Organizational Calendar");
  const [receipt, setReceipt] = useState("");
  const selected = importedEvents.find((event) => event.id === selectedImportedId) ?? importedEvents[0];
  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let accepted = 0;
    let skipped = 0;
    for (const file of Array.from(files)) {
      const result = parseCalendarSnapshot(await file.text(), sourceLabel.trim() || file.name);
      accepted += result.events.length;
      skipped += result.skipped.length;
      onImport(result);
    }
    setReceipt(`${accepted} 2027 event${accepted === 1 ? "" : "s"} imported · ${skipped} skipped`);
  };
  return (
    <div className="context-form">
      <div className="privacy-callout">
        <strong>Browser-local snapshot</strong>
        <p>The raw .ics file is parsed here and is never uploaded to the app server.</p>
      </div>
      <label><span>Calendar label</span><input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} /></label>
      <label className="file-drop">
        <span>Import Outlook snapshot</span>
        <input type="file" accept=".ics,text/calendar" multiple onChange={(e) => void importFiles(e.target.files)} />
        <small>Choose one or more Outlook .ics files</small>
      </label>
      {receipt && <div className="import-receipt">✓ {receipt}</div>}
      {selected ? (
        <article className="imported-detail">
          <span>{selected.sourceLabel} · {importedDispositions[selected.id] ?? "unresolved"}</span>
          <h3>{selected.title}</h3>
          <p>{selected.date} · {selected.startTime ?? "All day"}–{selected.endTime ?? ""} · {selected.durationMinutes} min</p>
          {selected.location && <p>{selected.location}</p>}
          <div className="imported-actions">
            <button type="button" onClick={() => onDisposition(selected.id, "kept")}>Keep existing</button>
            <button type="button" onClick={() => onDisposition(selected.id, "adopted")}>Use as planning anchor</button>
            <button type="button" onClick={() => onDisposition(selected.id, "override")}>Flag for override</button>
          </div>
        </article>
      ) : (
        <p className="empty-context">No Outlook snapshot has been imported.</p>
      )}
    </div>
  );
}

interface PlanYearContextProps {
  state: PlanYearState;
  selectedEventId: string | null;
  selectedImportedId: string | null;
  importedEvents: ImportedCalendarEvent[];
  importedDispositions: Record<string, ImportedDisposition>;
  onProposeMeeting: (eventId: string, patch: PlanEventOverride) => void;
  onBulkUpdate: (exactTitle: string, patch: PlanEventOverride) => void;
  onUpdateRule: (templateId: string, rule: WorkingMeetingRule) => void;
  onImport: (result: CalendarImportResult) => void;
  onDisposition: (eventId: string, value: ImportedDisposition) => void;
}

export function PlanYearContext({
  state,
  selectedEventId,
  selectedImportedId,
  importedEvents,
  importedDispositions,
  onProposeMeeting,
  onBulkUpdate,
  onUpdateRule,
  onImport,
  onDisposition,
}: PlanYearContextProps) {
  const [tab, setTab] = useState<ContextTab>(selectedImportedId ? "outlook" : "meeting");
  const activeStep = state.phaseSteps[state.activeStepIndex];
  const fallbackId = state.plan.events.find((event) => activeStep.templateIds.includes(event.templateId))?.id;
  const eventId = selectedEventId ?? fallbackId ?? null;
  const templateId = eventId
    ? state.plan.events.find((event) => event.id === eventId)?.templateId ?? activeStep.templateIds[0]
    : activeStep.templateIds[0];
  const tabs: { id: ContextTab; label: string }[] = [
    { id: "meeting", label: "Meeting" },
    { id: "rules", label: "Rules" },
    { id: "attendees", label: "Attendees" },
    { id: "outlook", label: "Import Outlook snapshot" },
  ];
  return (
    <aside className="context-panel" aria-label="Meeting planning context">
      <div className="context-tabs" role="tablist">
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.label}
            {item.id === "outlook" && importedEvents.length > 0 && <i>{importedEvents.length}</i>}
          </button>
        ))}
      </div>
      <div className="context-body">
        {tab === "meeting" && eventId && (
          <MeetingEditor key={eventId} state={state} eventId={eventId} onProposeMeeting={onProposeMeeting} onBulkUpdate={onBulkUpdate} />
        )}
        {tab === "meeting" && !eventId && <p className="empty-context">No meeting is selected in this step.</p>}
        {tab === "rules" && templateId && (
          <RuleEditor key={`rule-${templateId}`} state={state} templateId={templateId} onUpdateRule={onUpdateRule} />
        )}
        {tab === "attendees" && templateId && (
          <RuleEditor key={`attendees-${templateId}`} state={state} templateId={templateId} attendeesOnly onUpdateRule={onUpdateRule} />
        )}
        {tab === "outlook" && (
          <OutlookPanel importedEvents={importedEvents} selectedImportedId={selectedImportedId} importedDispositions={importedDispositions} onImport={onImport} onDisposition={onDisposition} />
        )}
      </div>
    </aside>
  );
}

export type { ImportedDisposition };
