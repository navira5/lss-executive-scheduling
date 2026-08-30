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

## Microsoft 365 integration checkpoint

The repository includes optional server-side Microsoft Graph adapters that can:

- load meeting rules and holidays from SharePoint/Microsoft Lists;
- load existing 2027 Outlook events as planning context; and
- create confirmed, export-eligible planner events in a configured Outlook test calendar after explicit human confirmation.

The adapters are covered by local contract tests and were authenticated against Navira's isolated Microsoft 365 trial tenant on 2026-08-30. The live verification loaded the SharePoint meeting and holiday lists, read the dedicated `LSS 2027 Demo Calendar`, created one attendee-free connection-test event, and read it back. This receipt proves the trial path only; it is not evidence of access to LSS's tenant. No Microsoft credentials are committed to this repository.

Outlook publishing fails closed unless `OUTLOOK_PUBLISH_ENABLED=true`. Keep that switch off except during an approved test against a non-production mailbox. The current adapter creates new events; it does not yet update existing events or perform Graph-backed duplicate detection.

Planner rule edits do not yet write back to SharePoint. SharePoint-to-planner loading is currently one-way.

## Hosted feedback access

The Sites-hosted prototype uses a temporary username and access code during the 30-day feedback period. The credentials and signed-session key live only in the hosting environment. All Microsoft API routes enforce the same signed session as the browser page.

This is intentionally a trial boundary:

- Microsoft data comes only from Navira's isolated trial tenant.
- Hosted Outlook publishing stays disabled during open feedback testing.
- Each tester's planning changes are stored only in that browser; testers are not editing one shared plan.
- Power Apps and Microsoft Lists own the editable rule data, while the custom planner reads the resulting SharePoint lists.
- LSS Microsoft Entra login, shared durable plan state, and planner-to-SharePoint write-back remain production follow-on work.

## Outlook snapshot fallback for the POC

Users can export an Outlook calendar as an `.ics` file and import it from the **Outlook snapshot** tab. Parsing happens in the browser. The prototype displays imported meeting title, date, time, and duration in neutral gray so users can see existing commitments before overriding a generated date.

The raw calendar file is not uploaded to the server or included in agent context. This snapshot path remains available when live Microsoft Graph access is not configured.

## Planning agent

The agent translates a natural-language request into a structured proposal. The deterministic scheduling layer still validates the proposal, and the user must apply it explicitly. It cannot approve rules or mutate locked layers autonomously.

For a live model-backed interpreter, set server-side environment variables before starting the app:

```bash
export OPENAI_API_KEY="your-key"
export OPENAI_MODEL="your-model-id" # optional
npm run dev
```

Without an API key, the interface truthfully labels and uses a limited **Demo interpreter** for the prepared demonstration command. It does not pretend that a live agent responded.

For local testing of the temporary hosted-access gate, configure the `DEMO_*` variables from `.env.local.example`. Keep `DEMO_AUTH_ENABLED=false` for ordinary local development.

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

- autonomously change a calendar or bypass the explicit publish gate;
- autonomously approve an exception;
- infer missing attendees or organizational authority;
- send raw Outlook event descriptions to the planning agent;
- include the day-to-day Executive Scheduling Advisor; or
- replace LSS's final review and approval;
- update existing Outlook events in place; or
- write planner rule edits back to SharePoint.

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
