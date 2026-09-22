# LSS Calendar Month-first Test — clone handoff

This directory is the current Canvas App clone source exported from the active
Power Apps authoring session on **2026-09-22**. It is intentionally separate
from `powerapps/lss-calendar-app/`, which is the older repository snapshot of
the main planner source.

## Identity and safety boundary

- Canvas app: **LSS Calendar Month-first Test**
- App ID: `6022cba8-0bb4-45f8-9147-307dad49c2c5`
- Environment: `Default-f656b17f-7f78-425e-b239-c96571057ba9`
- Working source was synced from the live authoring session before this handoff.
- The original app was not modified by the clone work.
- The clone has not been published as a production app.
- No credentials, tokens, or secrets belong in this directory.
- `_EditorState.pa.yaml` is deliberately omitted; Power Apps Studio owns it.

The clone uses the test SharePoint lists already connected in the app:

- `LSS Test Meeting Types 20260921` — rule/source data
- `LSS Test Planned Calendar 20260921` — saved plan rows, events, exclusions,
  closures, and layer receipts

The source files are `App.pa.yaml`, `CalendarPlanner.pa.yaml`,
`CalendarPlannerMonth.pa.yaml`, `CalendarPlannerWeek.pa.yaml`, and
`BoardRulesReview.pa.yaml`.

## Why the clone exists

The main app had become difficult to test safely while its month-first calendar
behavior was changing. There were frozen or very slow screens, repeated
imports, unclear separation between rule-generated dates and manual exceptions,
and a risk that a fix would overwrite the original app. The clone provides an
isolated, testable copy while preserving the original app and its data.

The clone is not a vendor calendar and does not use Virto, JFDI, or another
third-party calendar product. It is a standard Power Apps Canvas implementation
over SharePoint-backed lists.

## Current product contract

### Views

- **Year** is the annual overview. It renders only the months that contain an
  unresolved decision when the Needs attention mode is active.
- **Month** is the primary planning workspace for adding meetings, blocking
  days, moving meetings, deleting meetings, and resolving flags.
- **Week** is the precise scheduling workspace for exact times, overlaps, and
  back-to-back meetings.
- The same saved event records are shared across all three views; the views do
  not maintain duplicate meeting state.

### Needs attention workflow

The Needs attention button is present in Year, Month, and Week. Clicking it:

1. switches the current view into Attention mode;
2. filters Year to months containing unresolved events;
3. jumps Month and Week to the earliest unresolved event;
4. shows only unresolved event chips in the filtered calendar; and
5. lets the user select the flagged date/meeting and use the normal context
   actions: **Approve**, **Move meeting**, or **Delete meeting**.

Approving a decision changes its `DecisionStatus` to `Approved`, persists the
mutation receipt, and removes it immediately from the unresolved count. The
right panel is a guide/shortcut, not a replacement for selecting the flagged
date on the calendar.

### Scheduling rules and decisions

- Rules generate meetings. Editing the rule is the way to change a recurring
  pattern.
- A holiday or blocked day is a hard stop: a meeting must never remain on that
  date.
- If a generated date lands on a blocked day, the planner proposes the next
  business day and marks the event `NeedsReview`; the user must approve it.
- A manual move or manual exception is intentional user judgment. Regeneration
  preserves it and flags a resulting conflict instead of silently overwriting
  it.
- Meetings may overlap when they have different titles/owners (for example,
  Rachel runs one and Karen runs another). The overlap is flagged, but the
  user may accept it.
- An overlap with the **same meeting title and same time** cannot be accepted.
- `Other recurring` and one-time meetings are first-class categories and must
  not disappear when the four principal planning families are filtered.

## Important history for the next agent

The project spent several iterations trying to make an imported package,
Virto overlay, and a custom calendar behave like the requested planner. Virto
was rejected because it introduced vendor cost/licensing and did not provide a
realistic editing workflow. The working direction is the native Canvas clone.

The main usability failures that drove the clone were:

- a blank calendar after import or hydration;
- Add meeting navigating away from the current Month view;
- Week missing Add meeting and Block day actions;
- a full-screen context panel with poor spacing;
- holiday/blocked-day labels and meeting chips clipping;
- rule saves reporting “Complete the visible required fields” despite visible
  values;
- flags persisting after the meeting was approved;
- Needs attention listing a meeting without telling the user which month/day to
  open; and
- regeneration risking the loss of manual moves.

The current clone addresses the functional path first. Cosmetic polish and the
remaining performance warnings should be handled after the user verifies the
workflow, not by rebuilding the app from scratch.

## Validation already run

On 2026-09-22, after syncing the authoring session:

- Canvas YAML validation: **passed** (`compile_canvas`, 6 files).
- Accessibility validation: **no errors**.
- App Checker still reports 23 pre-existing medium performance findings,
  including a screen complexity estimate of 360 for `CalendarPlanner`.
  Those warnings are not a reason to discard the clone; they identify future
  optimization work. Do not claim the performance work is complete.

## How to continue safely

1. Sync the active Canvas authoring session into a working directory before
   editing YAML. Syncing is important because Studio owns the current state.
2. Compile after every targeted edit; do not regenerate an entire screen just
   because a formula has a compile error.
3. Test the clone in this order:
   - reset the 2027 calendar;
   - add meetings from rules;
   - click Needs attention in Year, confirm only affected months remain;
   - click a flagged day and approve/move/delete from the context panel;
   - confirm the badge count drops after approval;
   - repeat in Month and Week;
   - test a different-title overlap and a same-title/same-time overlap;
   - test a holiday/blocked-day date and confirm no meeting remains on the
     hard-stop date.
4. Keep SharePoint writes scoped to the test lists until the client workflow is
   accepted.
5. Do not publish the original app or delete the clone until the user signs
   off on the functional demo.

## Known follow-up work

- Reduce the `CalendarPlanner` control complexity below the recommended 300
  only if it can be done without adding state or duplicating controls.
- Optimize the remaining `ForAll`/collection performance warnings after a
  real click-speed test; do not change rule semantics as part of optimization.
- Finish the final Year-view read-only polish, including whether Add/Block
  controls should be hidden outside the focused attention workflow.
- Add a concise, visible list of affected meeting names/dates if testing shows
  the filtered calendar still needs more orientation.
- Decide the post-demo persistence/version-history presentation. The current
  plan persists rows in the SharePoint test list and records mutation receipts;
  it is not a download/re-upload workflow.

