# Outlook read-only overlay — Phase 1 preparation

Status: **implementation plan, not implemented** (2026-09-25). The live Canvas app was synchronized and inspected for this plan; no Canvas formulas, controls, SharePoint records, or Outlook events were changed. The Canvas Authoring session currently reports **zero available APIs**. Navira must add and authenticate **Office 365 Outlook** in Power Apps Studio before the connector contract can be discovered or the live feature built.

## Release boundary

Phase 1 reads Outlook commitments into the existing planner. It never creates, updates, deletes, sends, or invites through Outlook. The demo uses **only Navira's authorized Outlook calendar** and labels it **Navira · Outlook**. Do not implement or test a second calendar source for the demo; let LSS describe its actual multi-person need after seeing the one-calendar journey. Felise's access to Rachel and Kim is a later LSS deployment question, not a demo prerequisite. A paid subscription does not itself establish a Canvas connector or another person's calendar permissions.

First release gate: open a user-selected month with actual Outlook appointments; inspect a possible overlap; move a planner-only test meeting; see the indication update; navigate away and back without duplication or lost LSS planning work. Do not create Outlook appointments for the demo without Navira's separate authorization. Navira may add dummy appointments herself.

## Verified Canvas starting point

The working app is **LSS Calendar Month-first Test**, app ID `6022cba8-0bb4-45f8-9147-307dad49c2c5`, environment `Default-f656b17f-7f78-425e-b239-c96571057ba9`. Its six `.pa.yaml` files are in `powerapps/lss-calendar-month-first-test-clone/`; connect and sync the live app before editing rather than treating that repository copy as live state.

| Existing source | Relevant control or data | Consequence for this edit |
| --- | --- | --- |
| `App.pa.yaml` | `colCalProofEvents` is the saved planner occurrence source; `PlannerHasActualOverlap`, `PlannerEventNeedsReview`, `PlannerEventIsVisible` are named formulas | Keep these planner meanings intact. Outlook data needs a separate session-only source and a separate possible-overlap calculation. |
| `CalendarPlanner.pa.yaml` | Year view; `btnPlannerOutlookReadOnly` is currently disabled and says “Sync with Outlook”; `galPlannerYearMonths` renders 12 months | Repurpose the entry point, but do not add Outlook appointment chips to all 12 grids. Show only period coverage or a link to Month. |
| `CalendarPlannerMonth.pa.yaml` | `btnPlannerMonthPrevious/Next`, `varPlannerFocusedDate`, `galPlannerMonthCellEvents`, `conPlannerMonthContext`, `varPlannerContextMode` | Load the focused month; show Outlook events in the existing date-cell experience; use the existing right panel for management, status, and read-only event details. |
| `CalendarPlannerWeek.pa.yaml` | `btnPlannerWeekPrevious/Next`, `galPlannerWeekCellEvents`, `conPlannerWeekContext` | Load the entire displayed Monday–Sunday interval, including a second month if the week crosses a boundary. Use the same read-only details contract. |
| Existing visibility strip | `varPlannerShowBoard`, `varPlannerShowCommittees`, `varPlannerShowExecutive`, `varPlannerShowOperations`, `varPlannerShowGeneral`, `varPlannerShowManual` | Add one Navira Outlook visibility checkbox. Hiding imported chips does not change the read-only checking scope. |
| Existing Needs attention | `DecisionStatus="NeedsReview"` on nondeleted planner records | Do not increase this count for an Outlook overlap when required attendance is not established. |

The session lists five connected data sources (three existing LSS lists and the two 2026-09-21 test lists), but **no APIs**. The current Canvas planner stores no confirmed attendee-to-calendar mapping in its exported screen formulas. Any demo-only “Navira required” planner event must be isolated test data, not a rewrite of Rachel's or Kim's rules.

## Proposed Canvas edit plan

This is a complex edit across the current screens. The Canvas edit workflow requires a reviewed plan before YAML changes, and the connector's real operation signatures must be inspected after it appears in `list_apis`.

### Screens to modify

| Action | Screen | File | Intended change |
| --- | --- | --- | --- |
| Modify | Year overview | `CalendarPlanner.pa.yaml` | Change the disabled Outlook action to “Show Outlook meetings”; show checked/not-checked coverage without adding individual Outlook chips to the year grid. Keep Year read-only. |
| Modify | Month workspace | `CalendarPlannerMonth.pa.yaml` | Add a compact Outlook entry/status and source visibility, merge normalized Outlook display records into bounded day presentation, and show read-only event details in the existing panel. Preserve Add/Block/Move/Delete/Reset behavior for LSS events only. |
| Modify | Week workspace | `CalendarPlannerWeek.pa.yaml` | Apply the same source/status/detail contract to the seven-day interval, including cross-month weeks and accurate local times. Preserve existing planner edit controls. |

### Screens to add

None. There must be no second calendar or separate Outlook page.

### App changes

After connector discovery, add typed session-only Outlook source, period-status, and event collections plus a shared normalization and overlap contract. **Do not** append imported Outlook records to `colCalProofEvents` or write them to `LSS Test Planned Calendar 20260921`. The precise Power Fx reader and operation names are pending `describe_api`; do not guess them from Microsoft Graph or from the Next.js prototype.

### Data and identity contract

- Each imported record needs Navira's source/calendar identity and a connector-provided event or occurrence identity. Deduplication key is source + calendar + occurrence/event ID, not title or visual position. This stable key is useful even though the demo has one source.
- Retain only source label, event key, start/end, availability (`Free`, `Tentative`, `Busy`, out of office, or unknown), permitted display title, sensitivity/visibility, optional verified link, and `CheckedAt`. Never ingest body, attachments, notes, or attendee lists for this slice.
- Keep UTC instants and an explicit local display conversion. Compare full intervals, not just same-day `Time` fields, so overnight events and daylight-saving boundaries remain correct.
- Keep event details only in session memory. On a new app session, clear them and display “Outlook not checked this session” while loading the saved LSS plan normally. Do not use browser storage or the shared planner list for imported appointments.
- Keep source checking selection distinct from source visibility. Hiding Outlook chips must not call Outlook or change overlap checking.
- A period is `Checked` only when **all pages** for that source and period have returned successfully. The [Outlook connector calendar-view action](https://learn.microsoft.com/en-us/connectors/office365/) documents a 256-event result limit and Skip/Top retrieval; [Graph calendar view](https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0) has its own paging path. Use the behavior of the actual approved connector.
- Use a request-generation key so results from a previously viewed month cannot overwrite the final selected period. Commit a completed month batch, not one record at a time.
- Treat access denied differently from temporary failure: remove Navira's cached details on denied access; a temporary error may display a prior authorized snapshot with its checked time.

### Functional changes

| Capability | Current behavior | Required transition | Visible evidence |
| --- | --- | --- | --- |
| Enable read-only Outlook view | Year button disabled; no API | User opens the existing context panel and requests the displayed period from Navira's authorized calendar | Correct real owner label, progress, and checked time; no Outlook write controls |
| Navigate periods | Month/Week focus changes without Outlook data | Check the viewed month or full displayed week, reusing a completed session snapshot | Correct period status; no stale response or duplicate chips |
| Show event details | Only planner events have summary selection | Outlook selection opens a read-only context state, with permitted title or “Busy” and optional verified link | No Move, Delete, Accept, or attendee-edit action for Outlook records |
| Compare overlap | Planner overlap currently compares `colCalProofEvents` only | Compare planned event interval with occupied Outlook interval; `Free` does not block; unknown attendance is a *possible* overlap | Indication updates after a planner move without changing the Outlook event or inflating Needs attention |
| Visibility | Planning-family checkboxes only | Toggle Navira's Outlook display independently from read-only checking | Immediate chip change; no network request; conflict context remains accurate |
| Refresh/failure | No Outlook status | Track never checked, loading, complete, empty, stale-refresh, temporary failure, and access denied for the displayed period | Status text never claims “clear” when the read failed or returned only a partial page |

### Presentation approach

Use the current neutral surface and dark readable text for Outlook, keep existing LSS family colors, and prefix imported display with the real source owner. Add a compact “Hide Outlook titles” choice for client-facing demos; it changes presentation only. The Year view shows only coverage and possible-overlap counts, not twelve months of imported appointments. In Month, bound the number of visible chips per day and expose a day list in the existing right panel when necessary. In Week, show time ranges and owner labels in the existing grid. Do not add a new screen, context panel, or duplicated full calendar control tree.

## Acceptance matrix prepared before the connector arrives

| Case | Expected result | Evidence type |
| --- | --- | --- |
| Actual Navira account, selected month | Real authorized appointments appear as “Navira · Outlook”; title respects permissions and Hide titles | Live Canvas runtime |
| Planner-only test meeting overlaps occupied Outlook interval | “Possible Outlook overlap” identifies whose calendar is occupied; existing Needs attention count is unchanged when attendance is unknown | Live Canvas runtime |
| Move planner meeting outside that interval | Possible overlap clears; Outlook appointment remains unchanged | Live Canvas + Outlook readback |
| Outlook event selection | Same right panel shows read-only source, date/time, checked time; no planner mutation actions | Live Canvas runtime |
| `Free` event | No occupied warning | Fixture or live, clearly labeled |
| Week crossing two months | Every displayed day is covered or explicitly marked unchecked; no false complete state | Fixture or live |
| More than one page | All events loaded before `Checked`; failed page leaves status incomplete | Labeled fixture unless live data exists |
| Rapid month changes | Last selected month wins | Runtime or deterministic fixture |
| Hide Navira Outlook chips, then refresh unchanged data | Visibility is immediate, checking scope unchanged, no duplicates or repeat acceptance request | Live Canvas + instrumentation |
| Sign out/new session/access denied | Imported details are cleared or rechecked; saved LSS plan still loads; no unauthorized cached title remains | Runtime |
| Baseline planner regression | Month/Week Add, Block, Move, Delete, rules, Needs attention, and reopen behavior still work. Reset/Undo defects are a separate stabilization gate and must not be labeled passed until repaired and tested with isolated data. | Live Canvas runtime and isolated Reset/Undo fixture |

Record baseline and during-load interaction latency on the same machine. A successful Canvas compile does not prove responsiveness. No test may be reported as live if it used fixtures. Do not publish the updated app until the real-account journey and regression gate pass.

## Continuation when Navira is home

1. In the app's Studio **Data** panel, add **Office 365 Outlook** and authenticate Navira's account. No credentials or tokens go into source files or chat.
2. Confirm it appears in the Data panel. Run Canvas `list_apis`, then `describe_api` for the exact connector operation and parameters; verify calendar listing, calendar-view reads, availability, paging, time zone, and event link behavior. Do not assume a paid subscription grants another mailbox's permissions.
3. Re-sync the live app into a YAML-only working directory; confirm the current app has not changed underneath this plan.
4. Present the final control-by-control Canvas edit plan for approval, then implement the smallest monthly journey, compile, and test in the actual Canvas runtime. Add Week and Year coverage without expanding the planner's write surface.
5. Compare the final live state with the repository clone. Update the clone handoff and verification receipts only after actual runtime proof; do not claim Outlook is complete on the strength of this preparation document.
