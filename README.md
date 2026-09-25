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

## Compare the four delivery options

The hosted comparison includes both a native Canvas App option using standard
Power Apps controls and a Power Apps + PCF option with a custom year-calendar
component. Their Plan meetings, Calendar, and Rulebook tabs use sample
in-browser data and do not connect to Microsoft services. The native preview
demonstrates the feasible standard-control workflow end to end: apply a rule,
view a month or annual list, add/edit/delete meetings and closures, and review
queued Outlook changes before approval. Neither preview modifies or replaces
the main planner.

Start the four-option comparison and separate PCF preview with one command:

```bash
npm run demo:compare
```

Then open:

- Delivery-options overview: `http://localhost:3000/scenarios`
- Main URL (redirects to options): `http://localhost:3000`
- Integrated calendar planner: `http://localhost:3000/integrated`
- Standalone calendar planner: `http://localhost:3000/standalone`
- Native Power Apps comparison: `http://localhost:3000/native-power-apps`
- Hosted Power Apps + PCF comparison: `http://localhost:3000/power-apps`
- Separate local Power Apps preview: `http://localhost:4176`

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

## Live Canvas app handoff (updated 2026-09-25)

The current Power Apps implementation is preserved at
[`powerapps/lss-calendar-month-first-test-clone/`](powerapps/lss-calendar-month-first-test-clone/).
Although its display name still includes “Test,” this clone is now the working
main Canvas app. An earlier release was compiled, tested in Power Apps Studio,
and published on 2026-09-25. The subsequent Year-view cleanup is saved in the
live coauthoring source and mirrored here, but has **not** been republished as
part of the current stabilization pass.

The current view contract is:

- **Year is read-only overview:** all 12 months, chips/counts/flags, lightweight
  meeting detail, and **Open in Month**. Year does not expose Add, Block, Move,
  Delete, Approve, or Edit rule actions.
- **Month is the primary planning workspace:** Add, Block, Move, Delete, Reset,
  and Needs attention all stay in the right context panel while the calendar
  remains visible.
- **Week is the precise scheduling workspace:** it uses the same in-panel
  actions plus exact time/duration validation.
- Reset and Add from rules remember the initiating Month/Week view and return
  to it after the shared worker completes.
- Undo's enabled state is bound to the shared snapshot collection. Source
  audit found Reset→Undo is incomplete and Month/Week Undo is not durable;
  do not rely on it to recover a reset of the shared calendar.
- Needs attention counts only non-deleted `NeedsReview` records, advances to
  the next unresolved item after resolution, and clears when none remain.
- Move warnings recalculate from the live draft date/time/duration. The stale
  warning/disabled Confirm defect was fixed, the acknowledgement step was
  removed, and a saved manual move is immediately treated as approved.

Canvas app identity:

- App: `LSS Calendar Month-first Test`
- App ID: `6022cba8-0bb4-45f8-9147-307dad49c2c5`
- Environment: `Default-f656b17f-7f78-425e-b239-c96571057ba9`

Current saved-source verification:

- `compile_canvas`: passed for all 6 synced files.
- Coauthoring round trip: passed; all six clone YAML files now match a fresh
  live-server sync, including `_EditorState.pa.yaml`.
- Accessibility check: no errors.
- App Checker: 24 medium performance findings remain, primarily legacy
  collection/`ForAll` patterns and Year-screen control count. The Year
  complexity estimate fell from 363 to 313 after two obsolete Month-only
  controls were removed; this does not prove a runtime speed gain.
- Runtime preview verified Month/Week Add, Block, Needs attention, in-panel
  Reset confirmation, Year read-only navigation, valid move enablement/save,
  and return-view behavior.
- The unattended final pass did not click destructive Reset or Delete against
  saved data. Reset→Undo must be repaired and tested using an isolated app
  **and isolated test data** before any destructive test against the shared
  plan. Do not reset populated 2027 or 2028 merely to test it.

See the clone README for the complete issue history, formulas, live test
receipt, known limitations, and safe continuation checklist. Future agents
must sync the live Canvas session before editing and must not restart from the
older `powerapps/lss-calendar-app/` snapshot or the Next.js comparison UI.
The [Reset/Undo repair and isolated test plan](docs/power-apps-milestones/reset-undo-repair-test-plan.md)
records the exact source gaps and the safety gate before a destructive test.
The [Year-view complexity cleanup plan](docs/power-apps-milestones/year-complexity-cleanup-plan.md)
lists 14 additional hidden-control candidates and the required regression
checks; that removal still awaits approval and has not been made.

The read-only Outlook Phase 1 source audit, proposed Canvas edit plan, and
acceptance matrix are in
[`docs/power-apps-milestones/outlook-read-only-phase-1-prep.md`](docs/power-apps-milestones/outlook-read-only-phase-1-prep.md).
This is preparation only: the Canvas app has not been changed for Outlook, and
the Office 365 Outlook API connection must be added in Studio before building.
The demo scope is **one read-only source: Navira's Outlook calendar**. Do not
add a second calendar or Outlook write capability to the Canvas demo; LSS can
specify any broader need after seeing the one-calendar journey. The older
Next.js prototype's optional Outlook-write adapter is separate from this
Canvas Phase 1 boundary.

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
