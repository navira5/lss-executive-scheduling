# Reset/Undo repair and isolated test plan — 2026-09-25

This is a source audit and test plan, **not** a claim that Reset/Undo is fixed or
safe in the live shared planner. The current live coauthoring source was synced
on 2026-09-25 and matched all six YAML files under
`powerapps/lss-calendar-month-first-test-clone/` byte-for-byte. The populated
2027 and 2028 calendars were not reset for this audit.

## Safety boundary

- Do not click the final **Reset calendar** confirmation on the shared app or
  its populated 2027/2028 SharePoint list for testing. Reset writes `Deleted`
  statuses to durable event and exclusion records.
- A disposable copy of the app is **not enough** if it points at the same
  SharePoint list. Obtain approval for an isolated app and isolated test data,
  inspect every connector/list target in that copy, and seed only disposable
  fixtures before a destructive test.
- No Publish, Outlook connector changes, Outlook writes, or production-list
  mutations are part of this plan. Preserve the current saved plan while the
  repair is developed and verified.

## What the saved formulas currently do

| Path | In-memory state | Durable SharePoint state | Gap |
| --- | --- | --- | --- |
| Reset confirmation (`CalendarPlanner.pa.yaml`, `btnPlanYrStartCleanConfirm`) | Copies each current-year event into `colPlannerUndo`, then removes current-year events and exclusions; clears history and receipts; sets all layer statuses to `Not started`; leaves closures in place. | Calls `btnPlannerPersistYear`, which marks absent events and exclusions `Deleted` and saves layer state. | Undo snapshot contains event rows only. It contains no exclusions, prior layer state, or receipts. Reset clears `colPlannerHistory` for **all** years, not just the chosen year. |
| Year Undo (`btnPlannerUndo`) | Re-collects Reset event snapshots and clears `colPlannerUndo`. | Calls `btnPlannerPersistYear`. | It cannot reconstruct exclusions, layer state, or cleared history/receipts. The success text says meetings restored, not full state restored. |
| Month Undo (`CalendarPlannerMonth.pa.yaml`, `btnPlannerMonthUndo`) | Re-collects Reset event snapshots or removes Add IDs, then clears `colPlannerUndo`. | No persistence call. | A reopen can reload the pre-Undo saved state. The fallback message for other actions still clears their undo state. |
| Week Undo (`CalendarPlannerWeek.pa.yaml`, `btnPlannerWeekUndo`) | Reverses several actions in local collections, then clears `colPlannerUndo`. | No persistence call. | A reopen can reload the pre-Undo saved state. It also lacks Year Undo's hard-stop guards for Move/Delete. |
| Hydrate (`CalendarPlanner.pa.yaml`, `btnPlannerHydrateYear`) | Rebuilds events, exclusions, closures, and layer state from the saved list; synthesizes some layer build receipts. | Read only. | It cannot restore the original history or confirmation receipts cleared by Reset. |

The visible Undo button is enabled only when `CountRows(colPlannerUndo)>0`.
Reset creates one Undo row **per existing event**. If a year contains zero
meetings but has exclusions or layer state to clear, Reset can change durable
state while leaving Undo disabled. The earlier screenshot of a disabled Undo
after a populated reset is real user evidence, but its exact runtime cause has
not been established; do not assert this zero-event case explains that
screenshot. Investigate the actual event count and collection state in an
isolated runtime.

Reset and Add from rules now return to the initiating Month/Week view via
`varPlannerReturnView`; that navigation is source-verified and was exercised
without final destructive Reset. The Reset receipt can still say "Saved" before
checking whether `btnPlannerPersistYear` reported a partial failure; navigation
also proceeds regardless of `colPlannerPersistenceErrors`.

## Required repair invariant

For a selected planning year, define the pre-reset snapshot using stable keys:
active events by `EventId`, active exclusions by `EventId`, layer rows by
`StepNumber`, and closures by `ClosureId`. Reset may deliberately clear
non-durable receipts, but its user-facing promise must accurately distinguish
what Undo restores. The safest target behavior is:

1. Reset captures every durable field it will change **before** making any
   change. Do not use a per-event collection as the sole signal that a reset
   transaction exists.
2. Reset affects only the chosen year. In particular, do not clear another
   year's in-memory history or state as a side effect.
3. Reset persists its changed event, exclusion, and layer rows. If any write
   fails, show an incomplete-save state and do not claim a clean saved reset.
4. Undo is available for a successfully reset year even when the original
   meeting count was zero. It restores the complete reset snapshot—not merely
   meeting chips—and persists that restoration before reporting success.
5. A failed Undo does not discard the only valid snapshot. The same-year
   Reset→Undo→close/reopen result must match the pre-reset durable snapshot
   by stable ID and relevant fields. Retained closures and Rule Book rows must
   remain unchanged throughout.
6. Month, Week, and Year must call the same guarded Undo worker rather than
   maintaining three divergent implementations. The user remains on the
   initiating Month/Week view and focused date after Reset and Undo.
7. Add-from-rules Undo removes **only** IDs created by that Add transaction,
   persists the reversal, and leaves pre-existing and manual meetings intact.

The implementation must decide explicitly whether history and confirmation
receipts are durable product state or session-only evidence. They are not
currently hydrated from SharePoint. If they are excluded from Undo, change
the Reset/Undo wording so no UI implies their restoration. Do not silently
claim an exact full-state Undo while discarding them.

## Isolated fixture and acceptance tests

Before running these tests, record the isolated app ID, environment, exact
SharePoint list IDs/URLs, the current year, and a point-in-time export of the
fixture rows. Verify that no data-source formula in the isolated app still
targets `LSS Test Planned Calendar 20260921` or another shared list. The user
must approve creation of this disposable app and data source; do not create
them by assumption.

| Test | Seed / action | Required evidence |
| --- | --- | --- |
| Month Reset→Undo→reopen | Seed generated, manual, and moved events; one exclusion; non-default layer state; active closure. Reset from Month, Undo in Month, close/reopen. | Same event IDs, dates, times, statuses, exclusion IDs, and layer states as the pre-reset export. Closure unchanged. Month and focus retained. SharePoint rows agree with UI. |
| Week Reset→Undo→reopen | Same fixture, initiated from Week. | Same durable equality and retained Week/focus. |
| Empty-event reset | Seed zero events but at least one exclusion or changed layer state. Reset then Undo. | Undo is enabled and restores exclusions/layer state; no false "nothing to undo" result. |
| Partial write failure | Use a controlled isolated-list failure during Reset, then during Undo. | Explicit incomplete state; no false success receipt; recoverable snapshot remains; retry or recovery path documented. |
| Add-from-rules Undo | Seed one already-existing generated event and one manual event; leave at least one confirmed rule occurrence missing. Add from rules, then Undo and reopen. | Only newly created IDs disappear; both original events remain unchanged. |
| Year isolation | Seed a second year with distinct events/history. Reset the target year in the fixture. | Other-year persisted rows and current session state remain unchanged. |
| Cross-view consistency | Execute Undo from the Month and Week panels for supported mutations. | Same eligibility and persistence result as Year; unsupported actions cannot consume the undo token. |

Compare records by stable ID and field values, not just category totals or
calendar chip counts. Run compile/App Checker plus actual Studio/player
interactions. Capture before/after/reopen screenshots and a scrubbed row-level
comparison without personal meeting details. Only after the isolated suite
passes should a targeted live-app edit be considered, followed by a separate
live non-destructive regression pass. **Do not publish** as part of that pass.

## Current status

- Source defect confirmed; repair not implemented.
- Destructive runtime tests not run on the shared app, by design.
- Isolated app and isolated test data require user approval.
- Year-view control cleanup is a separate pending approval. Its hidden
  persistence, hydration, Add-all, and Undo workers must not be deleted.
