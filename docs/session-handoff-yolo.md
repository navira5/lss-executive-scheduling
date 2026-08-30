# YOLO Restart Handoff: LSS Executive Scheduling

Date: 2026-08-30

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
- Planner to Outlook: `Publish Approved to Outlook`

Not implemented:

- Planner write-back to SharePoint rule rows.
- Updating existing Outlook events in place.
- De-duplicating already published Outlook events by existing Graph event lookup.

Current Outlook publish code creates events in the configured mailbox/calendar only when the UI confirmation is accepted and `OUTLOOK_PUBLISH_ENABLED=true`. It uses a Graph `transactionId`, which helps make create retries safer, but the integration has not yet been authenticated against Graph from this repository. The demo must use a test calendar first.

Live trial receipt on 2026-08-30:

- Microsoft client-credentials authentication succeeded.
- `/api/sharepoint-plan` loaded both SharePoint lists and generated 139 2027 occurrences with no import warnings.
- `/api/outlook-events` read the dedicated `LSS 2027 Demo Calendar`.
- One attendee-free 15-minute connection-test event was created on 2027-01-06 and read back through the application route.
- The publish switch was returned to `false` and a subsequent publish attempt was correctly rejected with 403.

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

The client secret exists only in ignored local configuration and the hosted runtime environment.

For production, ask Chad about least-privilege site-specific permissions and Exchange application access policies before granting broad app permissions.

## Demo Flow

1. Open the custom planner.
2. Click `Load SharePoint Rules`.
3. Click `Load Outlook Events`.
4. Show that existing Outlook events appear as context on the calendar.
5. Make planning changes in the custom calendar UI.
6. Confirm the relevant layer.
7. Export the working plan as PDF or the confirmed meetings as ICS.

For a controlled owner-led write demonstration only, temporarily enable Outlook publishing, publish to the dedicated demo calendar, verify the result, and disable publishing again. Hosted feedback users do not receive Outlook write access.

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
- Outlook publishing remains disabled.
- Each tester's calendar changes remain in that browser's local storage.
- Power Apps edits the SharePoint-owned rules; the planner reads them one-way.
- True LSS Entra login and shared durable plan state remain later work.
