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

The same planning experience is also available at `/standalone` as a
Microsoft-free feedback option. It uses isolated browser-local state, accepts
calendar context through `.ics` files, exports confirmed meetings as `.ics`,
and downloads the current working rulebook as a SharePoint-ready CSV. It makes
no SharePoint or Outlook API calls.

## Microsoft 365 integration checkpoint

The repository includes optional server-side Microsoft Graph adapters that can:

- load meeting rules and holidays from SharePoint/Microsoft Lists;
- load existing 2027 Outlook events as planning context; and
- preview and then create, update, or delete events in one configured Outlook test calendar after explicit human confirmation; and
- write confirmed meeting-rule changes back to the SharePoint meeting-type list.

The adapters are covered by local contract tests and were authenticated against Navira's isolated Microsoft 365 trial tenant on 2026-08-30. The live verification loaded the SharePoint meeting and holiday lists and read the dedicated `LSS 2027 Demo Calendar`. A full Outlook sync check previewed, created, updated, and deleted one attendee-free verification event, then proved that it no longer remained. This receipt proves the trial path only; it is not evidence of access to LSS's tenant. No Microsoft credentials are committed to this repository.

Outlook synchronization fails closed unless `OUTLOOK_PUBLISH_ENABLED=true`. The browser first requests a server-computed review containing every create, update, and delete; a second explicit Upload action is required to apply it. Only planner-managed events or Outlook events a user explicitly queues can be deleted. Unrelated Outlook events remain untouched.

Planner rule edits write back only when the user confirms the active planning layer. The Entra application needs the Microsoft Graph application permission `Sites.ReadWrite.All` with admin consent before this route can update the trial list.

## Hosted feedback access

The Sites-hosted prototype uses a temporary username and access code during the 30-day feedback period. The credentials and signed-session key live only in the hosting environment. All Microsoft API routes enforce the same signed session as the browser page.

This is intentionally a trial boundary:

- Microsoft data comes only from Navira's isolated trial tenant.
- Hosted Outlook writes are constrained to Navira's isolated mailbox and dedicated `LSS 2027 Demo Calendar`, with a mandatory review step.
- Each tester's planning changes are stored only in that browser; testers are not editing one shared plan.
- Power Apps and Microsoft Lists own the editable rule data; the custom planner reads it and writes confirmed rule changes back.
- LSS Microsoft Entra login and shared durable plan state remain production follow-on work.

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

## Compare the three planning approaches

The repository also contains a separate, local-only preview of how the core
rule-to-meeting workflow could feel in a native Microsoft Power Apps-style
interface. Its Plan meetings, Calendar, and Rulebook tabs are complete visual
screens for comparison; they use sample in-browser data and do not connect to
Microsoft services. It does not modify or replace the main planner.

Start all three demonstrations with one command:

```bash
npm run demo:compare
```

Then open:

- Integrated calendar planner: `http://localhost:3000`
- Standalone calendar planner: `http://localhost:3000/standalone`
- Power Apps-style preview: `http://localhost:4176`

Use `Control-C` in the terminal to stop all demonstrations.

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
