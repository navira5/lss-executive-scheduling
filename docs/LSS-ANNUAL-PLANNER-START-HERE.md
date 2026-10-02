# LSS Annual Planner — Codex project handoff

Updated October 2, 2026 after the final focused regression pass. This Git copy includes the operating and technical handoff materials, but not the original Excel/PDF source files or the private transfer package; request those privately from Navira if source-level verification is needed. This document is a **starting map, not a claim that the repository YAML equals the published app**. Read it before changing the Power App.

Clone the public repository with `git clone https://github.com/navira5/lss-executive-scheduling.git`. Open the cloned folder in Codex and begin with this file. GitHub access alone does not grant access to Navira's Microsoft environment or its live Power App.

The portable bundle intentionally contains **no Canvas app code**. The app must be opened and freshly synced from Power Apps before code changes; the bundle supplies the business sources, decisions, tests, and exact starting procedure. It contains no live SharePoint records or Outlook connection.

## First 15 minutes on the laptop

1. Open this Git repository **or the extracted portable handoff bundle** in Codex. Install or enable the **Canvas Apps** plugin if it is not available, and sign in to the same Microsoft test account with access to the app. Do not put passwords, access codes, or tokens in this file or in source control.
2. Open the [Power Apps Studio editor](https://make.powerapps.com/e/Default-f656b17f-7f78-425e-b239-c96571057ba9/canvas/?action=edit&app-id=%2Fproviders%2FMicrosoft.PowerApps%2Fapps%2F6022cba8-0bb4-45f8-9147-307dad49c2c5). Confirm the environment is **abbasi (default)** and the app is **LSS Annual Planner_V1**. The in-app heading is **LSS Annual Planner**. Wait until Studio finishes loading; note whether it says Saved, Saving, or Unpublished.
3. In Codex, connect the Canvas Authoring plugin to environment `Default-f656b17f-7f78-425e-b239-c96571057ba9` and app `6022cba8-0bb4-45f8-9147-307dad49c2c5`. Sync the *live coauthoring session* into a **new empty directory dedicated to `.pa.yaml` files**. Do not sync into this workspace root or over a historical snapshot. If `sync_canvas` returns no files, stop: re-open or reload Studio and reconnect; do not edit an old local copy as if it were live.
4. Inspect the freshly synced files and Studio's Data pane. Record the exact connected SharePoint list names, Outlook connector, screen names, App Checker findings, and current published/saved status. The copied workspace contains conflicting historical snapshots, so this live check is mandatory.
5. Preview the app without mutating data. Check Month launch, Year/Week/Rule Book navigation, the Month action labels, and the current published status. Then agree on a *single* next change and its acceptance test with the user.

The [hosted POC website](https://lss-2027-calendar-planner.navira-ali.chatgpt.site/) and, in the full workspace, the nested `lss-executive-scheduling/` web project are **not** the Canvas app's runtime or authoritative Power Fx source. The portable bundle does not include that web project. Do not run `npm` to start the Power App. Work on the Canvas app in Power Apps Studio and its freshly synced `.pa.yaml` files.

## What the product does

LSS Annual Planner is a 2027 annual meeting-planning Canvas app. Its four main destinations are **Month**, **Year**, **Week**, and **Rule Book**. Month is the intended startup/default view and main planning workspace. Year is the twelve-month overview; Week shows more precise scheduling detail. The Rule Book stores recurring meeting definitions, including recurrence, time, format, and invitee emails. Meeting layers/themes include Board, Committees, Executive, Operations, Other recurring, and One-time; the visible checkboxes both filter the planner and are intended to scope outbound Outlook sync to selected layers.

Users can generate meetings from saved rules, add manual one-off meetings, block days, move/review meetings, and view Outlook items from the signed-in user's authorized calendar. Outbound Outlook sync has a review step and can create or update selected planner meetings on the signed-in user's owned calendar. A same-title, same-local-date-and-time event should not be created twice. The final smoke test confirmed controlled Outlook transfer and repeat-sync duplicate prevention.

Do not assume a saved rule automatically sends invitations. Planner changes, rule generation, and Outlook sync are separate actions. The Power App and its SharePoint records live in Navira's Microsoft test tenant for the demo; LSS's own environment is a later deployment step.

## Where information lives

| Need | Place to check | Authority |
| --- | --- | --- |
| Current app behavior and formulas | Fresh live Studio session plus a fresh Canvas Authoring sync | First for implementation state |
| Current saved meeting rules and planner records | SharePoint lists connected in Studio's Data pane | First for persisted data; app package alone does not carry list records |
| Approved 2027 source precedence and holiday decisions | `SOURCE_AUTHORITY.md` | First for business-rule interpretation |
| September 29 rule-by-rule reconciliation and unresolved conflicts | `LSS-2027-RULE-BOOK-RECONCILIATION.md` | Latest documented business-state check, not proof of today's live data |
| Functional scenarios and prior test findings | `LSS-Annual-Planner-Acceptance-Criteria-and-Test-Report.md` | Historical September 27 baseline; re-test changed items |
| Final operating and technical handoff | `LSS-Annual-Planner-Team-Handoff-Guide.pdf` or `.docx` | Current delivery, deployment, list-schema, and ownership guide |
| Earlier deployment considerations | `LSS-Annual-Planner-Deployment-Handoff-DRAFT-2026-09-27.md` | Historical draft only; its early status and source-list claims are stale |
| Local Canvas YAML copies, if the full workspace was copied | `lss-annual-planner-fix-20260927/` and many dated backup folders | Historical or candidate code only; never assume published |

The original later Excel workbook (`2027 Leadership Team Meeting Calendar- Draft1 (2).xlsx`) and in-office PDF (`LSS-2027-Annual-Calendar-Plan (1).pdf`) came from the previous computer's `Downloads` folder. They are **not committed to this Git repository**; ask Navira for the private portable handoff bundle if the originals are needed. The September 29 reconciliation documents what was reviewed. No full Codex conversation transcript is included in either place.

## Business decisions that must not be lost

- The later Excel workbook controls meeting cadence, dates, duration, and format when it addresses a rule. The in-office PDF controls deliberate extra blocked days and fills meeting-time gaps. The user separately approved retaining the main holidays. See `SOURCE_AUTHORITY.md` for the full precedence order.
- Keep the twelve documented 2027 blocked dates: eight original holiday fixtures, Good Friday, day after Thanksgiving, observed New Year's Day 2028, and the PDF's extra **December 23 closure**. Do not describe the standard holidays as if they were all printed in the PDF.
- The Operations cadence is **February/May/August/November** paired Wednesday–Thursday meetings, superseding the PDF's older month pattern. Do not auto-generate guessed paired dates from a single-day rule.
- Several Excel entries conflict with their written recurrence rules or fall on Sundays. The September 29 reconciliation lists them; do not silently “correct,” auto-generate, or send those disputed dates to Outlook. In particular, clarify the October Leadership date, September Leadership retreat, Executive retreat pattern, Executive Team virtual/in-person sequence, and BVR/program mappings with LSS.
- The Rule Book was reconciled in the live demo data on September 29, but meeting instances were **not** regenerated or sent to Outlook then. At that check, the visible 2027 planner had zero active meeting instances. Re-check current rows before assuming that remains true.

## Verified release status — October 2, 2026

- The published player cold-launched into Month with the saved plan.
- Month, Year, Week, and Rule Book navigation retained the selected year and shared plan.
- Rule Book create, save, and delete persisted to SharePoint and refreshed after reload.
- Deleting a single meeting in Month and Week remained deleted after a cold reload.
- **Delete meetings from rules** removed generated meetings while preserving the labeled manual meeting and blocked days and returned to the initiating Month view.
- A disposable confirmed weekly Executive rule generated 52 meetings. **Delete future meetings** removed the rule immediately, kept Undo unavailable while cleanup ran, reduced Executive meetings from 114 to 62, and remained correct after a cold reload. On the current demo lists, a large cleanup can take roughly 60–75 seconds; progress should advance rather than remain stuck at `0 of N`.
- Controlled Outlook review and sync completed, and repeating the sync did not create a duplicate.
- The accepted roughly 301-control count is a known implementation characteristic, not a release blocker.

The connected lists are `LSS Test Meeting Types 20260921` and `LSS Test Planned Calendar 20260921`. Despite the historical word “Test” in their technical names, the first list contains the actual completed LSS business Rule Book. Do not call the Rule Book test data. The final LSS deployment must migrate the complete active Rule Book and the planner records approved by LSS.

The repository YAML remains a reference snapshot unless a fresh Canvas Authoring sync proves otherwise. Do not choose a source file by folder name or modification time. Open Studio and obtain a successful fresh sync before code work.

## How to navigate and change the Canvas app safely

### Navigate in Studio and preview

From the Power Apps editor, use **Tree view** for `CalendarPlannerMonth`, `CalendarPlanner` (Year), `CalendarPlannerWeek`, and `BoardRulesReview` (Rule Book). Use **Data** to inspect SharePoint and `Office365Outlook` connections; use **App Checker** for compile/performance/accessibility diagnostics. In preview, the top navigation switches Year, Month, Week, and Rule Book. Month and Week have the planner action row and a context panel; the Outlook add/sync actions are separate from rule generation. Clicking a date or meeting opens details/actions in the context panel. The Rule Book has category filters, a rule list, and a selected-rule editor with explicit Save changes.

### Edit sequence

1. Inspect the freshly synced source. Typical files are `App.pa.yaml` (startup, collections, shared formulas and data hydration), `CalendarPlanner.pa.yaml` (Year and shared generation/reset operations), `CalendarPlannerMonth.pa.yaml` (Month UI/actions and Outlook review), `CalendarPlannerWeek.pa.yaml` (Week UI/actions), `BoardRulesReview.pa.yaml` (Rule Book), and `_EditorState.pa.yaml` (Studio screen order). Confirm these assignments in the fresh sync before relying on them.
2. Make a narrow, reviewed change in the dedicated synced directory. Preserve existing user data and unrelated formulas. If a data source must change, verify the actual connection and schema in Studio; a string replacement in YAML alone is not proof of a working connection.
3. Run `compile_canvas` on that directory and resolve errors. Then inspect the relevant screen in Studio/preview and execute a targeted regression test. A clean compile does **not** prove that buttons work, SharePoint saved a row, or Outlook delivered an invitation.
4. Check Studio's save status. Publish only after the user requests publication or approves the release, and verify the published player separately. Record the app/version and test result in this handoff or a new dated note. Do not silently publish an unverified candidate.

For destructive testing, first record before/after active rows in the connected SharePoint lists. Use uniquely labeled disposable records and remove only those records afterward. The existing lists contain the real business Rule Book, so do not bulk-delete, mass-send Outlook invitations, or regenerate disputed 2027 rules. Outlook sync can affect a real mailbox; check the destination calendar and invitees at the review step.

### Minimum acceptance pass after a change

1. Cold-launch the published app; Month loads with saved plan, no white page or JSON error.
2. Navigate Month → Year → Week → Rule Book → Month without losing the selected year or saved state.
3. Create one labeled manual One-time meeting; verify its title/date/time and persistence after reload.
4. With that meeting present, invoke **Delete meetings from rules** on a year containing at least one generated meeting. Confirm generated meetings are removed, the manual meeting and blocked days remain after a cold reload, and the app stays on Month if launched from Month. Test Undo only if shown, then verify its persistence.
5. Save/edit/delete a labeled test rule; verify the selected-rule panel refreshes immediately and persists after reload. Do not regenerate disputed 2027 rules.
6. If testing Outlook, select only one intended layer and a disposable event. Review title, local date/time, target calendar, and invitees before confirmation. Verify no duplicate on repeat sync and inspect Outlook itself—not just the app's success count.

## Deployment boundary

This app currently belongs to the **abbasi demo environment**, not LSS's Microsoft tenant. The Rule Book content is real LSS business data even though its current SharePoint list name contains “Test.” A Canvas app package or `.pa.yaml` export does not migrate SharePoint list schema/data, connection permissions, Outlook consent, or published status. For LSS handoff, their IT team must create or map approved lists, migrate the complete active Rule Book and approved planner records, import the app through their Power Platform process, reconnect SharePoint and Outlook, test with LSS accounts, and publish the reviewed LSS release. Keep credentials out of handoff files.

## Future blank department template - not built

After the accepted handoff, Navira identified a possible future use: a separate blank planner for another LSS department, such as philanthropy and fundraising. The recommended approach is a clone of the accepted app connected to two new empty SharePoint lists with the same schemas. The clone would remove the existing LSS executive/board Rule Book data and 2027-specific startup assumptions while retaining the working Month, Year, Week, Rule Book, generation, blocked-day, persistence, and Outlook workflows.

Use a separate app and separate lists for each department to keep its data isolated. Do not blank, repurpose, or modify the accepted `LSS Annual Planner_V1` for this idea. No blank template has been built or authorized. A tested department-specific clone is estimated at approximately 2-4 focused working days; a single multi-department app would require a larger workspace and permissions redesign.

## Prompt to start the new Codex task

> Read `LSS-ANNUAL-PLANNER-START-HERE.md`, the final handoff guide, and the linked business-authority files. Do not edit old YAML snapshots. Open the live LSS Annual Planner_V1 Power App in the abbasi default environment, connect Canvas Authoring, and sync into a new empty YAML-only directory. Report the actual live data sources and saved/published status before making changes. Preserve the complete business Rule Book, manual meetings, closures, and Outlook safety.
