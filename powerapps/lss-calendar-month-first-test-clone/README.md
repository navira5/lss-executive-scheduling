# LSS Calendar Month-first Test — live Canvas app handoff

This directory contains the current server-synchronized source for the live
Power Apps Canvas app. It is the app now being treated as the main calendar
planner, even though its display name still includes “Test.”

## Current status — 2026-09-25

- Canvas app: **LSS Calendar Month-first Test**
- App ID: `6022cba8-0bb4-45f8-9147-307dad49c2c5`
- Environment: `Default-f656b17f-7f78-425e-b239-c96571057ba9`
- Studio URL: `https://make.powerapps.com/e/Default-f656b17f-7f78-425e-b239-c96571057ba9/canvas/?action=edit&app-id=%2Fproviders%2FMicrosoft.PowerApps%2Fapps%2F6022cba8-0bb4-45f8-9147-307dad49c2c5`
- Published: **yes**, on 2026-09-25 at approximately 8:46 AM Eastern.
- `compile_canvas`: passed for all six Canvas files.
- Coauthoring round trip: passed; the six files in this directory were synced
  back from the live server after the final changes.
- Accessibility checker: no errors.
- App Checker: 26 medium performance findings remain. They are optimization
  debt, not formula or accessibility errors; see **Known follow-up work**.
- The full repository `npm test` command was attempted, but the host is on
  Node 20 and the script stalled while `npx` tried to obtain Node 22.13.1, so
  it was interrupted. That web-prototype test harness is separate from the
  successful Canvas compile, live Studio tests, and server round trip above.

The six files are:

- `App.pa.yaml`
- `BoardRulesReview.pa.yaml`
- `CalendarPlanner.pa.yaml`
- `CalendarPlannerMonth.pa.yaml`
- `CalendarPlannerWeek.pa.yaml`
- `_EditorState.pa.yaml`

Do not edit these files as if they were a separate web prototype. They are the
source representation of the live Canvas app and should be changed through a
Canvas Authoring MCP coauthoring session: connect to the app, sync to a fresh
working directory, make targeted YAML changes, compile, test in Studio, and
sync back before committing.

## Why this app/clone exists

The earlier planner became unsafe and frustrating to iterate on: imported
packages sometimes produced blank calendars, large screens felt frozen, the
context panel could take over the screen, Month and Week actions behaved
differently, and regeneration could blur the distinction between generated
dates and deliberate manual exceptions. The clone was created so the new
month-first workflow could be rebuilt and tested without overwriting the
original app.

That migration is now effectively complete: this clone is the working main
app. The original remains a recovery reference only. Do not restart the work
from the older `powerapps/lss-calendar-app/` snapshot and do not replace this
app with the Next.js or static preview; those are comparison/reference
implementations, not the live Power Apps product.

## Data and safety boundary

The app is connected to these test SharePoint lists:

- `LSS Test Meeting Types 20260921` — scheduling rules/source data
- `LSS Test Planned Calendar 20260921` — saved meetings, exclusions,
  closures, layer state, and mutation receipts

No credentials or tokens belong in this directory. Keep changes scoped to the
test lists until the production migration is explicitly approved.

## Product contract

### Year = overview only

- Shows all 12 months in the ordinary state.
- Shows meeting chips, counts, holidays/closures, and flags.
- In **Needs attention** mode, shows only months containing unresolved items.
- Selecting a meeting shows lightweight detail and **Open in Month**.
- Add, Block, Move, Delete, Approve, and Edit source rule are intentionally
  hidden in Year view. The controls still exist in source for state continuity,
  but their `Visible` property is `false`.

### Month = primary planning workspace

- Add meeting, Block day, Move meeting, Delete meeting, and Needs attention
  all run in the right context panel while the calendar remains visible.
- Reset opens its confirmation in the right context panel and returns to the
  same Month after the worker finishes.
- Add meetings from rules returns to the same Month and focused period.
- Undo is visible and enabled whenever `colPlannerUndo` contains a snapshot.

### Week = precise scheduling workspace

- The same context-panel actions are available without leaving the calendar.
- Exact start time and duration drive overlap validation.
- Reset and Add from rules preserve Week view and the focused week.
- Undo uses the same shared undo collection.

The same records in `colCalProofEvents` back all three views; the views do not
maintain separate meeting state.

## Needs attention behavior

The badge counts only unresolved records:

```powerfx
DecisionStatus = "NeedsReview" && !IsDeleted
```

Clicking **Needs attention** in any view focuses the earliest unresolved event.
Year filters to affected months; Month and Week remain on their respective
screens. Approve, Move, and Delete operate in the context panel. After each
resolution the formula re-queries the shared event collection, advances to the
next unresolved event, and clears Attention mode when none remain. Accepted or
manually moved events immediately leave the badge count.

## Move behavior and the defect that was fixed

The previous Move form reused stale warning state. A warning produced for a
9:00 AM slot could remain after the user selected 10:00 AM, and the Confirm
button could stay disabled even when the new slot was valid.

Month and Week now calculate overlap directly from the current draft values:

```powerfx
EventId <> varPlannerSelectedEventId &&
EventDate = varPlannerDraftDate &&
StartTime < DateAdd(varPlannerDraftStart, varPlannerDraftDuration, TimeUnit.Minutes) &&
EndTime > varPlannerDraftStart
```

The warning and `DisplayMode` use the same expression. A valid changed slot
enables **Confirm move** immediately. The old “Acknowledge warning” step was
removed. Saving a manual move writes `DecisionStatus: "Approved"`, so the user
is not asked to approve the date they just chose.

## Reset, Add from rules, and Undo

- Reset begins in Month/Week with a visible in-panel confirmation rather than
  navigating to a separate editor or immediately switching to Year.
- The existing Year worker performs the destructive reset only after that
  confirmation, captures event snapshots in `colPlannerUndo`, persists the
  result, and uses `varPlannerReturnView` to navigate back to the initiating
  Month or Week.
- Add from rules also sets `varPlannerReturnView`, uses the shared generation
  worker, records added event IDs in `colPlannerUndo`, and returns to the
  initiating view/focus.
- Month and Week Undo handles `Reset` by restoring snapshot events and handles
  `Add` by removing the newly generated IDs. The button is enabled whenever
  the undo collection is nonempty.

## Context-panel UX changes completed

- Add meeting no longer opens a full-screen Planning Editor from Month/Week.
- Block day no longer opens a full-screen Planning Editor from Month/Week.
- Move, Delete, and Reset confirmations stay in the current context panel.
- Mutation receipts stay in the panel and do not require a separate “Dismiss
  receipt” step to continue the core workflow.
- Unnecessary warning acknowledgement and duplicate post-save approval steps
  were removed.
- The context panel uses deliberate padding and internal scrolling so receipts
  and actions remain reachable without pushing the active calendar away.

## Live verification completed

The following paths were exercised in Power Apps Studio preview against the
live coauthoring session:

- Month Add opens in the context panel and Cancel returns to the Month.
- Month Block opens in the context panel and Cancel returns to the Month.
- Week Add opens in the context panel and Cancel returns to the Week.
- Week Block opens in the context panel and Cancel returns to the Week.
- Needs attention remains in Month and Week and focuses an unresolved item.
- Year shows only lightweight detail plus **Open in Month**; the editing
  actions are absent.
- **Open in Month** focuses the selected meeting in Month view.
- Leadership Team Meeting was moved from 9:00 AM to 10:00 AM: the stale overlap
  warning cleared, Confirm became active, and the move saved. It was then moved
  back to 9:00 AM successfully.
- Undo became visible and active after the move.
- Add meetings from rules returned to the initiating Month/focus.
- Month Reset and Week Reset both opened their confirmation inside the context
  panel and Cancel left the user on the same view.
- The final source compiled clean, synchronized back from the server, and was
  published successfully.

One destructive path was deliberately not executed unattended: the final
**Reset calendar** confirmation, because it deletes the current 2027 meeting
rows. Its context-panel entry, worker handoff, snapshot construction, undo
formula, persistence, and return-view formula were statically verified; run
the final click only during an attended acceptance test.

Delete confirmation was likewise inspected rather than executed against the
saved test data during the final unattended pass.

## Known follow-up work

1. Run the attended destructive-reset acceptance test:
   - start in Month and record the focused month;
   - Reset calendar and confirm;
   - verify Month/focus is restored and Undo is enabled;
   - click Undo and verify the meetings return;
   - repeat once from Week if desired.
2. If Add from rules actually adds missing rows, verify Undo removes only those
   newly added rows and preserves pre-existing/manual meetings.
3. Exercise Approve/Move/Delete on a multi-item Needs attention queue and verify
   the count decrements and advances after every action.
4. Reduce the remaining App Checker warnings without changing scheduling
   semantics. Most are legacy collection/`ForAll` performance warnings plus the
   large Year-screen control count.
5. Outlook integration is the next product phase. Keep it behind preview and
   explicit human confirmation; do not let Outlook become a second planner
   source of truth.

## Safe continuation checklist

1. Connect the Canvas Authoring MCP session to the app ID/environment above.
2. Sync to a new empty working directory. Never sync over an unsaved working
   copy.
3. Make small edits to the owning screen only; do not regenerate whole screens.
4. Compile after each change wave.
5. Test the exact runtime path in Studio preview.
6. Run accessibility and App Checker. Treat formula/accessibility errors as
   blockers; document medium performance warnings honestly.
7. Save and publish only after the live path passes.
8. Sync into a fresh temporary directory again and copy that exact server state
   into this directory before committing.
