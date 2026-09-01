# YOLO Restart Handoff: LSS Executive Scheduling

Date: 2026-09-01

## Latest Continuity Update — 2026-09-01

The project now presents three distinct ownership/deployment options without
mixing their data paths:

1. **Integrated custom planner** — the existing rich planner with optional
   SharePoint and Outlook integration at `/integrated`.
2. **Standalone custom planner** — the same planning workflow with no Microsoft
   API calls at
   `https://lss-2027-calendar-planner.navira-ali.chatgpt.site/standalone`.
   It uses the same temporary signed-session login, has isolated browser-local
   state, imports calendar context from `.ics`, exports confirmed meetings to
   `.ics`, exports the plan to PDF, and downloads the current working rules as
   a SharePoint-ready CSV.
3. **Power Apps-style comparison** — a local visual prototype at
   `http://localhost:4176` when `npm run demo:compare` is running. The same
   comparison is now included in the hosted app at `/power-apps`. It remains a
   comparison surface, not a live Power Platform deployment.

All three options are now connected through a common delivery-option switcher.
The hosted `/scenarios` route gives Rachel, the COO, and Chad a concise choice
screen explaining what each option includes, its tradeoff, and who owns
production support. The `/integrated` and `/standalone` routes both
link back to this choice screen and directly to the other options. The main
hosted URL redirects to `/scenarios`, making this the first screen after login.

The standalone route deliberately does not render or call SharePoint or Outlook
controls. Its browser storage key is separate from the integrated planner, so
testing one option cannot overwrite the other option's local working plan.

Current verified source and deployment:

- Git commit: `08f65f9` (`feat: add standalone calendar planning option`)
- GitHub `main` contains that commit.
- Sites production version: 32
- Full `npm test` suite passed, including production build and rendered checks
  for the landing page and all three option routes.

One unrelated untracked directory remains in the worktree:

- `power-platform/`

It contains separate Power Platform/PCF exploration. Do not delete, overwrite,
or include it in an unrelated commit without reviewing it first.

The recommended scope language for Navira is:

- Standalone means no Microsoft integration effort, not literally zero future
  maintenance. It still needs a hosting owner, access-code management, file
  handoffs/backups, and occasional application support.
- The integrated custom planner requires LSS/Chad's team to own Entra, Graph,
  SharePoint schema, deployment, monitoring, and production support.
- A Power Apps + custom PCF direction is still custom development. Navira may
  provide a proof of concept, packaged source, and documentation; LSS should own
  production implementation, deployment, security approval, and maintenance.

## Exact Codex Continuity Command

The durable session ID transferred from the original machine is:

```text
01a02a7f-da35-7bd2-81fd-56c080c984ea
```

Using the explicit ID is safer than `resume --last`, because `--last` can select
a newer unrelated Codex session. Run:

```bash
codex -C /Users/naviraabbasi/lss-executive-scheduling \
  -m gpt-5.6-sol \
  --dangerously-bypass-approvals-and-sandbox \
  resume 01a02a7f-da35-7bd2-81fd-56c080c984ea
```

`resume --last` is acceptable only when this is definitely the most recently
used Codex session in that repository.

## Repository

Working repo:

- `/Users/naviraabbasi/lss-executive-scheduling`
- GitHub: `https://github.com/navira5/lss-executive-scheduling`

## User Goal

Navira is preparing a Microsoft 365 demo for LSS/Chad showing that:

- SharePoint/Microsoft Lists can own the rule data.
- Power Apps can act as a simple admin/editor surface.
- The existing custom React calendar planner remains the main scheduling experience.
- Outlook calendar events can be read before planning.
- Approved planner events can be published to Outlook only after human approval.

## Current Architecture Decision

Do not try to rebuild the full planner inside Power Apps.

Use this hybrid structure:

- SharePoint Lists: source of truth for meeting rules and holidays.
- Power Apps: business/admin editor for SharePoint list rows.
- Custom React planner: scheduling engine, calendar UI, conflict detection, approvals, export, Outlook sync.
- Microsoft Graph: server-side bridge for SharePoint and Outlook.

## SharePoint Status

Navira already created these SharePoint lists in the Microsoft 365 trial tenant:

- `LSS Meeting Types`
- `LSS Holidays and Closures`

She imported Meeting Types successfully and created Holidays for 2027. At her request, the holiday import excluded:

- 2027-02-15
- 2027-10-11
- 2027-11-11

Generated import files are in:

- `sharepoint-import/`

Important generated files:

- `sharepoint-import/lss-meeting-types-existing-list-paste.tsv`
- `sharepoint-import/lss-meeting-types-sharepoint.csv`
- `sharepoint-import/lss-holidays-2027-paste.tsv`
- `sharepoint-import/lss-holidays-2027.csv`
- `sharepoint-import/new-holiday-2027.csv`
- `sharepoint-import/lss-generated-events-2027.csv`

## Code Added

SharePoint:

- `app/api/sharepoint-plan/route.ts`
- `lib/sharepoint-plan.ts`
- `tests/sharepoint-plan.test.ts`

Outlook:

- `app/api/outlook-events/route.ts`
- `app/api/outlook-publish/route.ts`
- `lib/outlook-sync.ts`
- `tests/outlook-sync.test.ts`

Docs/config:

- `.env.local.example`
- `docs/microsoft-365-transition-spec.md`
- `docs/session-handoff-yolo.md`

Updated app UI:

- `app/CalendarPlanner.tsx`
- `app/globals.css`

Updated planner internals:

- `lib/scheduling.ts`
- `lib/plan-year.ts`
- `lib/plan-agent.ts`
- `lib/types.ts`

Updated tests/package:

- `package.json`
- `tests/rendered-html.test.mjs`

## Current Sync Behavior

Implemented:

- SharePoint to planner: `Load SharePoint Rules`
- Outlook to planner: `Load Outlook Events`
- Planner to Outlook: `Review Outlook Changes` then explicit `Upload to Outlook`
- Planner to SharePoint: confirmed dirty rules are written when the active layer is confirmed
- Manual ad-hoc planner event creation
- Planner-event removal and explicit Outlook-event deletion, both reviewed before Outlook upload

Not implemented:

- Shared durable planner state across testers.
- LSS Entra login and per-user audit attribution.
- Production tenant deployment or LSS mailbox access.

The Outlook sync route recomputes the requested change set on the server, compares planner-managed event markers against the configured calendar, and applies creates, updates, and explicitly requested deletions only when the UI confirmation is accepted and `OUTLOOK_PUBLISH_ENABLED=true`. The retired direct-publish route now returns 410. The demo remains scoped to Navira's dedicated test calendar.

Live trial receipt on 2026-08-30:

- Microsoft client-credentials authentication succeeded.
- `/api/sharepoint-plan` loaded both SharePoint lists and generated 139 2027 occurrences with no import warnings.
- `/api/outlook-events` read the dedicated `LSS 2027 Demo Calendar`.
- A full sync check previewed, created, updated, and deleted one attendee-free verification event.
- The final verification found zero remaining copies of that event.

This proves only Navira's isolated Microsoft trial tenant. It does not prove access to LSS's tenant.

## Environment Variables

Use `.env.local.example` to create `.env.local`.

Required for SharePoint:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `SHAREPOINT_SITE_HOSTNAME=abbasi1010.sharepoint.com`
- `SHAREPOINT_SITE_PATH=/sites/LSSSchedulingDemo`
- `SHAREPOINT_MEETING_TYPES_LIST=LSS Meeting Types`
- `SHAREPOINT_HOLIDAYS_LIST=LSS Holidays and Closures`

Required for Outlook:

- `OUTLOOK_TARGET_USER`
- `OUTLOOK_CALENDAR_ID` optional; blank means default calendar
- `OUTLOOK_TIME_ZONE=Eastern Standard Time`
- `OUTLOOK_PUBLISH_ENABLED=false` until an approved test mailbox is ready

## Microsoft Entra Trial Setup

The `LSS Calendar Planner Demo` app registration now exists in Navira's trial tenant with admin-consented Microsoft Graph application permissions:

For the demo, likely Graph application permissions:

- `Sites.Read.All`
- `Calendars.ReadWrite`
- `Sites.ReadWrite.All` (still needs to be added and admin-consented before app-to-SharePoint rule updates work)

The client secret exists only in ignored local configuration and the hosted runtime environment.

For production, ask Chad about least-privilege site-specific permissions and Exchange application access policies before granting broad app permissions.

## Demo Flow

1. Open the custom planner.
2. Click `Load SharePoint Rules`.
3. Click `Load Outlook Events`.
4. Show that existing Outlook events appear as context on the calendar.
5. Make planning changes, create an ad-hoc event, or remove an event in the custom calendar UI.
6. Confirm the relevant layer; confirmed dirty rules synchronize to SharePoint.
7. Click `Review Outlook Changes` and inspect every proposed create, update, and delete.
8. Explicitly upload the reviewed changes to the dedicated test calendar.
9. Export the working plan as PDF or the confirmed meetings as ICS.

## Verification Already Run

Full suite passed again on 2026-08-30:

- `npm test`

This included:

- scheduling tests
- plan-year tests
- agent-route tests
- calendar-import tests
- rule-summary tests
- SharePoint integration tests
- Outlook sync tests
- production build
- rendered HTML smoke test

## Local Server

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/
```

Current endpoint behavior when credentials are intentionally removed:

- `/api/sharepoint-plan` returns missing Microsoft env vars.
- `/api/outlook-events` returns missing Microsoft/Outlook env vars.

The current ignored `.env.local` is configured for Navira's trial tenant. The missing-credential behavior remains covered by tests.

## Hosted Feedback Boundary

The hosted build now has a temporary signed-session login suitable for the 30-day feedback period. Configuration uses:

- `DEMO_AUTH_ENABLED`
- `DEMO_USERNAME`
- `DEMO_ACCESS_CODE`
- `DEMO_SESSION_SECRET`

The username, access code, Microsoft client secret, target mailbox, and calendar ID must remain in ignored local configuration or Sites runtime environment variables. Never commit them.

During feedback testing:

- The hosted app reads SharePoint and the dedicated trial Outlook calendar.
- Outlook writes are enabled only for the dedicated trial calendar and require review plus explicit upload.
- Each tester's calendar changes remain in that browser's local storage.
- Power Apps edits the SharePoint-owned rules; the planner reads them and writes confirmed rule changes back after the additional Graph permission is granted.
- True LSS Entra login and shared durable plan state remain later work.
