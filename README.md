# LSS 2027 Calendar Planning Workbench

A rules-first proof of concept for Lutheran Social Services of Central Ohio's 2027 annual governance and organizational calendar planning session.

## Current boundary

The prototype generates a 2027 working scenario from historical 2026 evidence and explicit assumptions. It combines:

- a 3 × 4 annual calendar;
- a Decision Queue for contradictions, missing inputs, and calendar exceptions;
- source and rule-status provenance for each proposed item;
- POC-only scenario controls and local review decisions; and
- CSV export and a printable calendar view.

It does **not** connect to Outlook, change production calendars, confirm organizational rules, or include the day-to-day Executive Scheduling Advisor. Local review actions remain separate from source rule authority.

## Run locally

The project requires Node 22.13 or later. The scripts use an isolated Node 22 runtime automatically in the current development environment.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm test
```

The test suite validates the scheduling engine's golden scenarios, compiles the production bundle, and checks the server-rendered planning workflow.

## Evidence and assumptions

The unchanged source documents remain under `docs/source/`. The POC fixtures in `data/source-data.ts` also reflect the reviewed historical uploads: the 2026 Board Calendar, 2026 LSS Meetings Calendar, and Meeting Matrix.

The fixture registry deliberately preserves unresolved items instead of inventing rules, including Board cadence, the official 2027 LSS holiday list, Finance-to-Board dependencies, conflicting All Staff patterns, Leadership Retreat timing, Quarterly Program Briefing ownership, BVR slot mapping, Internal Risk definition, Operations structure, and Supervisory Team frequency.

## Primary implementation files

- `data/source-data.ts` — normalized meeting evidence and scenario assumptions
- `lib/scheduling.ts` — deterministic date generation, constraint checks, alternatives, and export
- `app/CalendarPlanner.tsx` — annual calendar and Decision Queue workflow
- `tests/scheduling.test.ts` — golden rule and safety scenarios
