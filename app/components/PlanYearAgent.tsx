"use client";

import { useState } from "react";

import {
  buildAgentContext,
  interpretDemoRequest,
  validateAgentProposal,
  type AgentProposal,
} from "@/lib/plan-agent";
import type {
  PlanChangeProposal,
  PlanEventOverride,
  PlanYearState,
} from "@/lib/plan-year";
import { PHASE_LABELS } from "@/lib/plan-year";

type AgentMode = "ready" | "live" | "demo" | "error";

function compactPatch(value: unknown): PlanEventOverride {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const patch: PlanEventOverride = {};
  if (typeof source.startTime === "string") patch.startTime = source.startTime;
  if (typeof source.durationMinutes === "number") patch.durationMinutes = source.durationMinutes;
  if (typeof source.title === "string") patch.title = source.title;
  if (typeof source.message === "string") patch.message = source.message;
  if (typeof source.location === "string") patch.location = source.location;
  if (typeof source.modality === "string") patch.modality = source.modality;
  return patch;
}

function modelProposal(value: unknown): AgentProposal {
  if (!value || typeof value !== "object") {
    return { kind: "cannot_complete", explanation: "The agent returned an invalid proposal." };
  }
  const source = value as Record<string, unknown>;
  const eventIds = Array.isArray(source.eventIds)
    ? source.eventIds.filter((item): item is string => typeof item === "string")
    : [];
  switch (source.kind) {
    case "move":
      return typeof source.date === "string"
        ? { kind: "move", eventIds, date: source.date }
        : { kind: "clarify", question: "Which date should these meetings use?" };
    case "bulk_update":
      return {
        kind: "bulk_update",
        eventIds,
        exactTitle: typeof source.exactTitle === "string" ? source.exactTitle : "matching meetings",
        patch: compactPatch(source.patch),
      };
    case "regenerate_layer":
      return { kind: "regenerate_layer" };
    case "clear_layer":
      return { kind: "clear_layer" };
    case "clarify":
      return {
        kind: "clarify",
        question: typeof source.question === "string" ? source.question : "What should change?",
      };
    default:
      return {
        kind: "cannot_complete",
        explanation:
          typeof source.explanation === "string"
            ? source.explanation
            : "The agent could not translate that request safely.",
      };
  }
}

interface PlanYearAgentProps {
  state: PlanYearState;
  pendingChange: PlanChangeProposal | null;
  onPendingChange: (proposal: PlanChangeProposal | null) => void;
  onApplyChange: (proposal: PlanChangeProposal) => void;
  onAdvance: () => void;
  onConfirm: () => void;
  onClear: () => void;
  onRegenerate: () => void;
}

export function PlanYearAgent({
  state,
  pendingChange,
  onPendingChange,
  onApplyChange,
  onAdvance,
  onConfirm,
  onClear,
  onRegenerate,
}: PlanYearAgentProps) {
  const [request, setRequest] = useState("");
  const [reply, setReply] = useState("");
  const [mode, setMode] = useState<AgentMode>("ready");
  const [working, setWorking] = useState(false);
  const step = state.phaseSteps[state.activeStepIndex];
  const isFinalStep = state.activeStepIndex === state.phaseSteps.length - 1;
  const confirmLabel = `Confirm ${PHASE_LABELS[state.activePhase]}`;

  const submit = async () => {
    const text = request.trim();
    if (!text || working) return;
    setWorking(true);
    setReply("");
    onPendingChange(null);
    const context = buildAgentContext(state);
    try {
      const response = await fetch("/api/plan-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request: text, context }),
      });
      let proposal: AgentProposal;
      if (response.status === 503) {
        setMode("demo");
        proposal = interpretDemoRequest(text, context);
      } else if (response.ok) {
        setMode("live");
        proposal = modelProposal(await response.json());
      } else {
        setMode("error");
        setReply("The live planning agent could not respond. No calendar change was applied.");
        return;
      }
      if (proposal.kind === "clarify") {
        setReply(proposal.question);
        return;
      }
      if (proposal.kind === "cannot_complete") {
        setReply(proposal.explanation);
        return;
      }
      if (proposal.kind === "clear_layer") {
        setReply("I can clear this layer. Use the Clear active layer control below to confirm.");
        return;
      }
      if (proposal.kind === "regenerate_layer") {
        setReply("I can rebuild this layer from its working rules. Use Regenerate below to confirm.");
        return;
      }
      const validation = validateAgentProposal(state, proposal);
      onPendingChange(validation);
      setReply(
        validation.valid
          ? "I prepared a change for your review. Nothing has moved yet."
          : validation.reason ?? "That change is not valid.",
      );
    } catch {
      setMode("error");
      setReply("The planning agent is unavailable. Your calendar was not changed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="agent-card" aria-label="Plan Year scheduling agent">
      <div className="agent-heading">
        <div className="agent-avatar" aria-hidden="true">A</div>
        <div>
          <p className="eyebrow">Planning agent · {step.label}</p>
          <h2>Let’s plan {step.meetingLabel}</h2>
        </div>
        <span className={`agent-mode ${mode}`}>
          {mode === "live"
            ? "Live agent"
            : mode === "demo"
              ? "Demo interpreter"
              : mode === "error"
                ? "Agent unavailable"
                : "Ready"}
        </span>
      </div>

      <div className="agent-question">
        <span>Next question</span>
        <p>{step.question}</p>
      </div>

      <label className="agent-input">
        <span>Ask the planning agent</span>
        <textarea
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          rows={3}
          placeholder="Try: Move all Board check-ins to 4:30 and keep them virtual"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void submit();
          }}
        />
      </label>
      <div className="agent-submit-row">
        <button className="button primary" type="button" disabled={!request.trim() || working} onClick={() => void submit()}>
          {working ? "Understanding request…" : "Propose changes"}
        </button>
        <small>The agent proposes. You approve.</small>
      </div>

      {reply && <div className={`agent-reply ${mode === "error" ? "error" : ""}`}>{reply}</div>}

      {pendingChange && (
        <div className={`proposal-card ${pendingChange.valid ? "valid" : "invalid"}`}>
          <div>
            <span>{pendingChange.valid ? "Proposed change" : "Cannot apply"}</span>
            <strong>{pendingChange.summary}</strong>
            {pendingChange.reason && <p>{pendingChange.reason}</p>}
            {pendingChange.valid && (
              <small>{pendingChange.changes.length} meeting{pendingChange.changes.length === 1 ? "" : "s"} affected</small>
            )}
          </div>
          <div className="proposal-actions">
            {pendingChange.valid && (
              <button className="button primary" type="button" onClick={() => onApplyChange(pendingChange)}>
                Apply changes
              </button>
            )}
            <button className="button ghost" type="button" onClick={() => onPendingChange(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="layer-tools">
        <button type="button" onClick={onRegenerate}>Regenerate active layer</button>
        <button type="button" onClick={onClear}>Clear active layer</button>
      </div>

      <div className="phase-action">
        {!isFinalStep ? (
          <button className="button secondary full" type="button" onClick={onAdvance}>
            Continue to {state.phaseSteps[state.activeStepIndex + 1].label} →
          </button>
        ) : (
          <button className="button primary full" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        )}
        {!isFinalStep && (
          <button className="confirm-preview" type="button" disabled>
            {confirmLabel}
          </button>
        )}
      </div>
    </section>
  );
}
