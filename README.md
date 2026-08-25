# LSS 2027 Plan Year

A rules-first proof of concept for Lutheran Social Services of Central Ohio's 2027 annual governance and organizational calendar planning session.

## What the prototype does

The planning workspace follows LSS's annual planning sequence instead of presenting a global decision queue:

1. Load federal holidays and known constraints.
2. Plan Board and Governance one meeting group at a time.
3. Confirm that layer before moving to Executive Leadership.
4. Plan Organization and Operations.
5. Review the complete 2027 calendar.

Each active layer combines a 3 x 4 year view with:

- a compact horizontal stage bar that keeps the planning sequence visible while maximizing calendar space;
- rule-generated meeting dates;
- immediate drag-and-drop changes with deterministic holiday and lock validation;
- a short, context-aware planning question;
- natural-language change proposals that require human approval;
- contextual meeting, rules, and attendees editors;
- exact-title bulk updates that leave customized meetings alone;
- explicit confirmation and reopening of completed layers;
- a collapsible meeting-details panel for full-calendar review; and
- CSV export and browser-local working state.

## Outlook snapshot for the POC

Users can export an Outlook calendar as an `.ics` file and import it from the **Outlook snapshot** tab. Parsing happens in the browser. The prototype displays imported meeting title, date, time, and duration in neutral gray so users can see existing commitments before overriding a generated date.

The raw calendar file is not uploaded to the server or included in agent context. The prototype does not write to Outlook. A later pilot can replace the snapshot with Microsoft Graph read-only availability after LSS approves the access boundary.

## Planning agent

The agent translates a natural-language request into a structured proposal. The deterministic scheduling layer still validates the proposal, and the user must apply it explicitly. It cannot approve rules or mutate locked layers autonomously.

For a live model-backed interpreter, set server-side environment variables before starting the app:

```bash
export OPENAI_API_KEY="your-key"
export OPENAI_MODEL="your-model-id" # optional
npm run dev
```

Without an API key, the interface truthfully labels and uses a limited **Demo interpreter** for the prepared demonstration command. It does not pretend that a live agent responded.

## Run locally

The project requires Node 22.13 or later. The scripts use an isolated Node 22 runtime automatically in the current development environment.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run lint
npm test
```

The suite covers the scheduling engine, phased Plan Year state, proposal validation, calendar import and recurrence expansion, the production bundle, and the rendered workflow.

## Authority and safety boundary

The generated 2027 calendar is a working scenario based on historical 2026 evidence and explicit assumptions. Rule status, scenario assumptions, and human decisions remain separate. Confirming a planning layer does not silently turn an unvalidated rule into organizational policy.

The prototype does not:

- change production calendars;
- autonomously approve an exception;
- infer missing attendees or organizational authority;
- send raw Outlook event descriptions to the planning agent;
- include the day-to-day Executive Scheduling Advisor; or
- replace LSS's final review and approval.

## Evidence and implementation

The unchanged source documents remain under `docs/source/`. Normalized historical evidence and assumptions live in `data/source-data.ts`.

Primary implementation files:

- `lib/scheduling.ts` - deterministic date generation and constraints
- `lib/plan-year.ts` - phases, confirmations, overrides, and layer controls
- `lib/plan-agent.ts` - minimal agent context and deterministic validation
- `lib/calendar-import.ts` - browser-local Outlook snapshot parsing
- `app/CalendarPlanner.tsx` - Plan Year workspace
- `app/api/plan-agent/route.ts` - optional model-backed proposal route
- `tests/` - golden scheduling, safety, import, route, and rendered-flow checks
