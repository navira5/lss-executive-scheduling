# Plan Year Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the discovery queue with a phased, rules-first Plan Year workflow that supports contextual natural-language proposals, direct calendar adjustment, and browser-local Outlook snapshot import.

**Architecture:** Keep the existing deterministic generator as the calendar authority. Add a focused Plan Year state module that reveals and locks scheduling layers, an agent proposal module that validates structured actions before applying them, and a client-only iCalendar importer. A server route may call the OpenAI Responses API, but the browser applies only validated, human-confirmed proposals.

**Tech Stack:** Next.js/Vinext, React 19, TypeScript, browser LocalStorage, HTML5 drag-and-drop, OpenAI Responses API, `ical.js`, Node test runner.

---

## File Structure

- `lib/plan-year.ts` — phases, sublayers, visible-event selection, confirmation/reopen rules, instance and bulk edits.
- `lib/plan-agent.ts` — proposal schema, local demonstration interpreter, validation, preview, and application.
- `lib/calendar-import.ts` — client-side `.ics` parsing and 2027 recurrence expansion.
- `app/api/plan-agent/route.ts` — server-only OpenAI request and strict function-call extraction.
- `app/CalendarPlanner.tsx` — phased Plan Year shell and coordination.
- `app/components/PlanYearCalendar.tsx` — 3 × 4 calendar, drag targets, locked/imported states.
- `app/components/PlanYearAgent.tsx` — phase prompt, conversation, proposal preview, apply gate.
- `app/components/PlanYearContext.tsx` — meeting, rule, attendees, and Outlook import panels.
- `app/globals.css` — Plan Year layout and states.
- `tests/plan-year.test.ts` — phase, lock, edit, bulk update, and proposal safety tests.
- `tests/calendar-import.test.ts` — iCalendar minimum fields and recurrence tests.
- `tests/plan-agent-route.test.mjs` — missing-key and mocked structured-response route tests.
- `tests/rendered-html.test.mjs` — rendered workflow contract.

### Task 1: Plan Year State and Progressive Reveal

**Files:**
- Create: `lib/plan-year.ts`
- Create: `tests/plan-year.test.ts`
- Modify: `lib/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing phase tests**

```ts
test("starts with Board and hides later meeting layers", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  assert.equal(state.activePhase, "board");
  assert.ok(visiblePlanEvents(state).some((event) => event.category === "board"));
  assert.ok(visiblePlanEvents(state).every((event) => event.category === "board"));
});

test("confirmation unlocks the next layer while preserving locked anchors", () => {
  const board = createPlanYearState(generateCalendarPlan(baseline));
  const executive = confirmActivePhase(board);
  assert.equal(executive.activePhase, "executive");
  assert.ok(executive.confirmedPhases.includes("board"));
  assert.ok(visiblePlanEvents(executive).some((event) => event.category === "board"));
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm run test:plan-year`  
Expected: FAIL because `lib/plan-year.ts` does not exist.

- [ ] **Step 3: Implement the phase model**

```ts
export type PlanPhase = "board" | "executive" | "organization" | "review";

export interface PlanYearState {
  plan: CalendarPlan;
  activePhase: PlanPhase;
  confirmedPhases: PlanPhase[];
  eventOverrides: Record<string, PlanEventOverride>;
  workingRules: Record<string, WorkingMeetingRule>;
}

export const PHASE_ORDER: PlanPhase[] = [
  "board",
  "executive",
  "organization",
  "review",
];
```

Implement category-to-phase mapping, visible-event selection, confirm, reopen, clear active phase, regenerate active phase, and versioned serialization. Board phase includes `board` and `committee` categories; Executive includes `executive`; Organization includes `organization`.

- [ ] **Step 4: Run phase tests**

Run: `npm run test:plan-year`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/plan-year.ts tests/plan-year.test.ts package.json
git commit -m "feat: add phased Plan Year state"
```

### Task 2: Instance Editing, Exact-Title Bulk Updates, and Drag Validation

**Files:**
- Modify: `lib/plan-year.ts`
- Modify: `tests/plan-year.test.ts`

- [ ] **Step 1: Write failing edit tests**

```ts
test("bulk title update excludes a custom-title instance", () => {
  const initial = createPlanYearState(generateCalendarPlan(baseline));
  const board = activePhaseEvents(initial).filter((event) => event.templateId === "full-board");
  const customized = updateEvent(initial, board[0].id, { title: "Annual Governance Session" });
  const updated = bulkUpdateByExactTitle(customized, "Full Board Meeting", {
    title: "2027 Full Board Meeting",
    message: "Updated invitation message",
  });
  assert.equal(resolveEvent(updated, board[0].id).title, "Annual Governance Session");
  assert.ok(board.slice(1).every((event) => resolveEvent(updated, event.id).title === "2027 Full Board Meeting"));
});

test("rejects a drag to a verified federal holiday", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const event = activePhaseEvents(state)[0];
  const proposal = proposeEventMove(state, event.id, "2027-01-18");
  assert.equal(proposal.valid, false);
  assert.match(proposal.reason, /federal holiday/i);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:plan-year`  
Expected: FAIL because edit functions are missing.

- [ ] **Step 3: Implement immutable override and proposal functions**

```ts
export interface PlanEventOverride {
  date?: string;
  startTime?: string | null;
  durationMinutes?: number;
  title?: string;
  message?: string;
  location?: string;
  modality?: string;
  attendees?: string[];
  distributionLists?: string[];
}

export interface ChangeProposal {
  valid: boolean;
  summary: string;
  reason?: string;
  changes: ProposedPlanChange[];
}
```

Exact-title bulk matching must compare the resolved current title. Validate dates against verified federal holidays and locked phases before returning a valid proposal. Applying a proposal must be a separate function.

- [ ] **Step 4: Run tests**

Run: `npm run test:plan-year`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/plan-year.ts tests/plan-year.test.ts
git commit -m "feat: validate Plan Year meeting changes"
```

### Task 3: Natural-Language Proposal Boundary

**Files:**
- Create: `lib/plan-agent.ts`
- Create: `app/api/plan-agent/route.ts`
- Modify: `tests/plan-year.test.ts`
- Create: `tests/plan-agent-route.test.mjs`

- [ ] **Step 1: Write failing proposal tests**

```ts
test("interprets the golden Board check-in command without applying it", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const proposal = interpretDemoRequest(
    "Move all Board check-ins to 4:30 and keep them virtual",
    buildAgentContext(state),
  );
  assert.equal(proposal.kind, "bulk_update");
  assert.equal(proposal.patch.startTime, "16:30");
  assert.equal(proposal.patch.modality, "Virtual");
  assert.equal(state.eventOverrides[proposal.eventIds[0]], undefined);
});

test("agent proposals cannot bypass holiday validation", () => {
  const state = createPlanYearState(generateCalendarPlan(baseline));
  const unsafe = { kind: "move", eventIds: [activePhaseEvents(state)[0].id], date: "2027-01-18" };
  assert.equal(validateAgentProposal(state, unsafe).valid, false);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test:plan-year`  
Expected: FAIL because the agent module does not exist.

- [ ] **Step 3: Implement proposal schema and demo interpreter**

```ts
export type AgentProposal =
  | { kind: "move"; eventIds: string[]; date: string; startTime?: string }
  | { kind: "bulk_update"; eventIds: string[]; exactTitle: string; patch: PlanEventOverride }
  | { kind: "update_rule"; templateId: string; patch: WorkingMeetingRule }
  | { kind: "regenerate_layer" }
  | { kind: "clear_layer" }
  | { kind: "clarify"; question: string }
  | { kind: "cannot_complete"; explanation: string };
```

The local interpreter supports the golden demonstration requests and is labeled as a demo interpreter. It never claims live-model behavior.

- [ ] **Step 4: Implement the server-only model route**

The route returns `503` with `{ "error": "Live agent not configured" }` when `OPENAI_API_KEY` is absent. When present, it calls `POST https://api.openai.com/v1/responses` with `store: false`, model `OPENAI_MODEL || "gpt-5.6-luna"`, the active-layer context, and one strict function named `propose_plan_changes`. It extracts only that function's JSON arguments and returns them to the browser. Raw `.ics` content and meeting bodies are not accepted by the request schema.

- [ ] **Step 5: Run tests**

Run: `npm run test:plan-year && npm run test:agent-route`  
Expected: PASS, including missing-key truthful failure and mocked function-call extraction.

- [ ] **Step 6: Commit**

```bash
git add lib/plan-agent.ts app/api/plan-agent/route.ts tests/plan-year.test.ts tests/plan-agent-route.test.mjs package.json
git commit -m "feat: add guarded Plan Year language agent"
```

### Task 4: Outlook Snapshot Import

**Files:**
- Create: `lib/calendar-import.ts`
- Create: `tests/calendar-import.test.ts`
- Modify: `lib/types.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add `ical.js`**

Run: `npm install ical.js`  
Expected: `ical.js` appears in dependencies and the lockfile is updated.

- [ ] **Step 2: Write failing import tests**

```ts
test("imports required Outlook snapshot context", () => {
  const events = parseCalendarSnapshot(singleEventIcs, "Rachel");
  assert.equal(events[0].title, "Existing donor meeting");
  assert.equal(events[0].date, "2027-03-09");
  assert.equal(events[0].startTime, "14:00");
  assert.equal(events[0].endTime, "15:30");
  assert.equal(events[0].durationMinutes, 90);
  assert.equal(events[0].sourceLabel, "Rachel");
});

test("expands a weekly recurrence only within 2027", () => {
  const events = parseCalendarSnapshot(recurringIcs, "Organization");
  assert.ok(events.length > 1);
  assert.ok(events.every((event) => event.date.startsWith("2027-")));
});
```

- [ ] **Step 3: Run import tests and verify failure**

Run: `npm run test:calendar-import`  
Expected: FAIL because the importer does not exist.

- [ ] **Step 4: Implement browser-local parsing**

```ts
export interface ImportedCalendarEvent {
  id: string;
  sourceLabel: string;
  sourceUid: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  location?: string;
  organizer?: string;
  attendees?: string[];
  description?: string;
  recurrence?: string;
  original: "outlook_snapshot";
}
```

Use `ical.js` to expand occurrences intersecting `2027-01-01` through `2027-12-31`. Return an import result containing accepted events plus skipped records with explicit reasons. Do not perform network requests.

- [ ] **Step 5: Run import tests**

Run: `npm run test:calendar-import`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/calendar-import.ts lib/types.ts tests/calendar-import.test.ts package.json package-lock.json
git commit -m "feat: import Outlook calendar snapshots locally"
```

### Task 5: Build the Plan Year Interface

**Files:**
- Create: `app/components/PlanYearCalendar.tsx`
- Create: `app/components/PlanYearAgent.tsx`
- Create: `app/components/PlanYearContext.tsx`
- Replace: `app/CalendarPlanner.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Change the rendered contract first**

```js
assert.match(html, /Plan Year/);
assert.match(html, /Board &amp; Governance/);
assert.match(html, /Ask the planning agent/);
assert.match(html, /Import Outlook snapshot/);
assert.match(html, /Confirm Board &amp; Governance/);
assert.doesNotMatch(html, /Discovery session|Decision Queue/);
```

- [ ] **Step 2: Run the rendered test and verify failure**

Run: `npm run build && node --test tests/rendered-html.test.mjs`  
Expected: FAIL because the old discovery interface still renders.

- [ ] **Step 3: Implement the phased shell**

The shell loads versioned Plan Year state, renders the phase rail, passes only visible events to the calendar, and persists applied changes and confirmations locally. The initial server render must show Board & Governance, the Board baseline events, the agent's first Board question, and the rules tab.

- [ ] **Step 4: Implement direct calendar adjustment**

Active-layer chips are draggable. Day cells accept drops and call `proposeEventMove`; the resulting preview appears in the agent panel. Locked and imported chips are not draggable. Event detail includes an accessible date field for non-pointer users.

- [ ] **Step 5: Implement contextual editing**

The context panel includes Meeting, Rules, Attendees, and Outlook tabs. Meeting edits affect one occurrence. Rules support working updates and regeneration. Attendees and distribution lists use editable string lists. Exact-title bulk title/message controls show included and excluded counts before application.

- [ ] **Step 6: Implement agent proposal flow**

Submitting a prompt calls `/api/plan-agent`. A `503` switches to the clearly labeled demo interpreter. A valid proposal displays a summary, affected meetings, exclusions, and rule warnings. **Apply changes** is the only action that mutates state.

- [ ] **Step 7: Implement snapshot upload**

The Outlook tab accepts one or more `.ics` files and a source label, parses them in the browser, shows an import receipt, and adds neutral gray snapshot chips. Each imported event exposes Keep, Adopt, and Replace/override actions while preserving its source record.

- [ ] **Step 8: Style and run UI tests**

Run: `npm run lint && npm test`  
Expected: all engine, phase, import, route, build, and rendered tests PASS.

- [ ] **Step 9: Commit**

```bash
git add app/CalendarPlanner.tsx app/components app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: replace discovery with Plan Year workspace"
```

### Task 6: Browser Verification and Delivery

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Add local configuration documentation**

Document `OPENAI_API_KEY`, optional `OPENAI_MODEL`, `.ics` privacy boundaries, demo-interpreter labeling, local run steps, and the absence of Outlook write-back. Add `.superpowers/` to `.gitignore` because visual-companion artifacts are not source.

- [ ] **Step 2: Run complete verification**

Run: `npm run lint && npm test`  
Expected: PASS with no warnings or skipped safety scenarios.

- [ ] **Step 3: Exercise the real user path locally**

Verify in the browser:

1. Initial load shows only Board/Committee planning events plus calendar constraints.
2. Dragging a Board meeting opens a proposal; applying it moves the event.
3. A drag to January 18 is rejected.
4. The golden natural-language command produces a bulk proposal.
5. A customized Board title is excluded from the next exact-title bulk update.
6. Confirming Board unlocks Executive and locks Board events.
7. Importing the test `.ics` displays title, date, time, and duration.
8. Reloading restores the browser-local plan.

- [ ] **Step 4: Inspect the production build**

Start: `npm run dev`  
Open: `http://localhost:3000`  
Capture desktop and narrow-window screenshots and correct any overflow, unreadable chips, or hidden actions.

- [ ] **Step 5: Commit delivery documentation**

```bash
git add README.md .gitignore
git commit -m "docs: explain Plan Year prototype operation"
```
