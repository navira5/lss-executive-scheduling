# LSS Annual Planner — Deployment Handoff

> Historical September 27 record. Read [the October 1 handoff](LSS-ANNUAL-PLANNER-START-HERE.md) for current authority and unresolved verification; this document alone does not prove current live app behavior.

**Status:** Working draft for the receiving technology team. Not a deployment authorization.
**Prepared:** 2026-09-27
**Source app:** Power Apps Canvas app, currently titled “LSS Calendar Month-first Test” in the authoring session; the requested user-facing title is “LSS Annual Planner.”

> **Important current-state caveat:** The last visible Power Apps Studio state was a blank gray canvas labeled “Saving…”. The latest Canvas Authoring sync returned no files, and the authoring session currently reports no connector/data-source metadata. The local app source compiled before that sync response, but this does not prove that those changes are saved in Studio or present in the live app. Re-open Studio and verify the app before exporting, publishing, or using this guide as a deployment runbook.

## 1. Purpose and intended deployment

This handoff is for moving the LSS Annual Planner from its current test setup into an organization-managed Power Platform environment. It is not a specification for rebuilding the app on a different software platform. If the receiving team means a non-Power-Apps technology stack, treat that as a separate rebuild and integration project.

The app’s intended surfaces are:

- Year overview (12-month view)
- Month calendar
- Week calendar
- Rule Book for recurring meeting rules
- Meeting and calendar planning actions, including review/approval and blocked dates

The Outlook integration is scoped to Month and Week views. Outlook import is read-only. Outbound planner-to-Outlook event creation/update is intended to require an explicit review and confirmation step; confirm that behavior in the live app before representing it as released.

## 2. What is evidenced in the last available source

The last locally available Canvas source contains six app YAML files: `App.pa.yaml`, `CalendarPlanner.pa.yaml`, `CalendarPlannerMonth.pa.yaml`, `CalendarPlannerWeek.pa.yaml`, `BoardRulesReview.pa.yaml`, and `_EditorState.pa.yaml`.

The source references these SharePoint lists by test-specific names:

1. `LSS Test Meeting Types 20260921` — meeting/rule catalog.
2. `LSS Test Planned Calendar 20260921` — saved planner events and related planner records.

The source also calls the `Office365Outlook` connector for calendar discovery, event reads, and (in the locally compiled outbound-sync candidate) event create/update. The authoring-session API/schema tools did not return connector or list metadata during this handoff preparation, so the target tenant’s schemas and connections remain unverified.

### SharePoint fields referenced by the app source

The receiving team must compare these with the actual source list schemas and create a deliberate production mapping. Do not assume these names/types are complete or identical in the target tenant.

**Meeting Types list:** source code references the standard SharePoint `ID`, `Title`, and `Notes`, plus fields including `Category`, `Cadence`, `Frequency`, `Start Month`, `WeekOfMonth`, `DayOfWeek`, `PreferredTime`, `DurationMinutes`, `Modality`, `Flexibility`, `RuleStatus`, and `Completed`.

**Planned Calendar list:** source code references `ID`, `Title`, `Code`, `EventDate`, `StartTime`, `Duration`, `Category`, `SourceRule`, `Status`, `ReadyforOutlook`, `PlanningNotes`, and SharePoint audit fields such as `Modified`/`Created`.

Rule Book metadata is encoded in the `Notes` text using markers such as `PowerAppsRuleData=` and `PowerAppsRuleId=`. The locally available rule editor stores invitee addresses in rule metadata as a semicolon-separated `InviteesText` value. Preserve these values during migration or replace the encoding with a typed target schema and update the app together.

Planner records use `Category` values such as `PLNR_EVENT`, `PLNR_CLOSURE`, `PLNR_EXCLUSION`, `PLNR_LAYER`, `PLNR_PLAN`, and `PLNR_OUTLOOK`. `Code` values act as stable/upsert keys (including the `LSSPLN1|...` namespace). Confirm uniqueness and indexing needs before migrating records; do not transform these identifiers without a reviewed migration map.

Some 2027 holiday/closure rows are test fixtures in app source and are explicitly marked as test fixtures. Replace or approve them against the organization’s authoritative closure calendar before production use.

## 3. Recommended Power Platform deployment pattern

1. **Recover and baseline the source.** Open the correct app in Studio, wait for save to finish, confirm the title and all screens, save, export/download a fresh backup, and record the app ID, source environment, version, and timestamp. Keep the pre-deployment backup immutable.
2. **Confirm solution status.** Check whether the app and dependencies are already in a Power Platform solution. If not, the platform owner should place the app and solution-aware dependencies into an unmanaged development solution before using the organization’s normal promotion process.
3. **Provision a separate target environment.** Use the organization’s dev/test/prod environment strategy. Confirm region, tenant, environment type, makers, users, licensing, DLP policy, and support ownership.
4. **Provision target data.** Create or select the production Meeting Types and Planned Calendar lists in the correct SharePoint site. Compare column names, types, choice values, required fields, indexes, permissions, and existing records with the source. Back up and migrate data only after the business owner approves the mapping and cutover.
5. **Externalize environment-specific configuration.** The source currently embeds test-list names and does not evidence environment variables. Before promotion, replace test-specific site/list references with environment-specific configuration (prefer solution environment variables and connection references where supported), then verify every formula uses the intended target. Keep environment-specific values out of source-controlled literals where possible.
6. **Package dependencies.** Include the canvas app and solution-aware dependencies in the managed deployment package according to the organization’s ALM process. SharePoint lists/data are external dependencies and should be provisioned/migrated separately; they are not replaced merely by importing the canvas app.
7. **Resolve connection references after import.** Bind the SharePoint connection to the approved target site/list and the Office 365 Outlook connection to the approved connector. Each user’s Outlook connection is delegated to that user; document the consent/licensing experience and do not embed user credentials or tokens.
8. **Apply least-privilege access.** Grant only the required users access to run the app, read meeting types, and create/update planner rows. Grant appropriate Outlook connector permission for the signed-in user to act on their own calendar. Confirm whether any shared mailbox/calendar is intentionally in scope; the current source selects an owned calendar and should not be assumed to support delegated/shared calendars.
9. **Import to test first.** Import the solution/package into the target test environment, set environment values and connection references, share the app with the test group, then execute the validation checklist below.
10. **Promote and publish deliberately.** After business and technical sign-off, promote the approved managed solution/package to production using the organization’s pipeline or release process. Publish only the reviewed version, record the release/version, and retain a rollback package.

## 4. Outlook behavior and safety gates

The source’s inbound calendar reader uses `Office365Outlook.CalendarGetTablesV2` and `GetEventsCalendarViewV3`. The setup logic chooses the signed-in user’s owned primary calendar (named `Calendar` when available; otherwise an owned calendar). Inbound Outlook events are read-only to the planner.

The locally available outbound code targets the selected owned calendar and uses Outlook event create/update operations, carrying planner event identity into a saved planner-side sync link to support updates and avoid blind duplicate creation. Rule invitees are passed as required attendees. Before production, the team must verify connector behavior and API contract in its tenant, including organizer identity, invitees, response requests, timezone, retries, and error handling.

**Release gate:** Never test outbound sync against real invitees. Use a designated test mailbox/calendar and controlled test accounts. Verify that review displays the actual destination calendar/organizer, each meeting’s date/time/title, and all invitees; require a separate affirmative confirmation before sending. Test cancel and invalid-address paths and confirm no event is created on those paths.

The review-first confirm controls exist in the locally compiled candidate, but they have not been verified in the current Studio session and must not be considered deployed until opened, tested, saved, and included in the exported package.

## 5. Pre-release validation checklist

### App and data

- [ ] Correct app and intended version open in Power Apps Studio; no blank canvas or pending “Saving…” state.
- [ ] User-facing app title is “LSS Annual Planner”; Year, Month, Week, and Rule Book navigation all work.
- [ ] Rule Book has all expected meeting types and cadence options; saving, reopening, and editing a rule preserves all recurrence fields and invitee metadata.
- [ ] Year, Month, and Week show the same underlying saved planner data and correct layer filtering.
- [ ] Test/fixture holiday and closure data is replaced with or approved against the authoritative LSS source.
- [ ] Create, edit, move, approve, reject, delete, reset/undo, and blocked-date flows behave as intended and persist to the target list.
- [ ] No formulas still point to test list names, test sites, personal accounts, or unintended test-only data.

### Outlook

- [ ] Inbound sync reads the signed-in test user’s intended calendar and remains read-only.
- [ ] Outbound review names the expected host/organizer calendar and shows all eligible meetings and invitees.
- [ ] No action sends invitations until the user presses the explicit confirmation control; Cancel performs no write.
- [ ] Empty invitee list, one invitee, multiple invitees, invalid email, not-ready event, already-synced event, and interrupted/pending prior attempt are tested.
- [ ] Create is idempotent on retry; update changes the linked Outlook event rather than creating a duplicate.
- [ ] Dates, timezone, daylight-saving transitions, and duration/end time are correct.
- [ ] Outlook scope is limited to Month and Week as agreed; Year view does not accidentally invoke outbound sync.

### Identity, permissions, operations

- [ ] A representative non-maker user can run the app with only intended SharePoint and Outlook rights.
- [ ] Users see the correct data and cannot edit unauthorized lists/calendars.
- [ ] DLP, connector licensing, consent, sharing, and retention settings have platform/security owner approval.
- [ ] Support owner, incident route, monitoring expectations, data backup/restore, and release rollback are documented.

## 6. Rollback and cutover

Before cutover, retain (a) the last known-good solution/package, (b) the source app version/ID, and (c) a recoverable backup of each data list. For a failed app release, stop further promotion, restore the prior solution version through the approved ALM path, and rebind the prior connection/environment configuration. For a failed data migration, stop writes, restore the approved list backup or migration snapshot, and reconcile any events created after cutover. Do not delete test or production data as a rollback shortcut.

For an Outlook incident, immediately disable/hide outbound sync through the app release/configuration process while preserving read-only calendar display. Identify and reconcile any partially created events by planner event ID before retrying; do not bulk-retry uncertain pending operations.

## 7. Information the receiving tech team must supply

1. Target tenant and environment name/ID, region, and the organization’s solution/pipeline standard.
2. Target SharePoint site URL, approved Meeting Types and Planned Calendar list names, actual schemas, and data owner.
3. Whether to migrate the 2027 rules/events and which organization-approved holiday/closure source is authoritative.
4. Intended user groups, SharePoint roles, Outlook access scope, mailbox/calendar ownership model, licensing, and DLP requirements.
5. Required timezone, retention, audit, backup, support, and release approval procedures.
6. Whether they want a Power Apps deployment or a rebuild on a different technology stack.

## 8. Decision log / unresolved items

- **Live source identity and status:** verify when Studio is accessible; the last observed UI was blank and showed “Saving…”. The active authoring service most recently returned no files and no connector/data-source metadata.
- **Review-first outbound sync:** compiled locally, not live-verified or published.
- **Target list schemas:** source references are documented above; authoritative schema was unavailable during this draft.
- **Environment configuration:** test list names are embedded in source; environment-variable conversion and solution readiness are not yet evidenced.
- **Calendar target:** current source selects the logged-in user’s owned primary calendar by default. Confirm the designated test calendar and production policy with the mailbox owner.
- **Demo versus production readiness:** completing a successful demo is not equivalent to production security, ALM, data-migration, and support sign-off.
