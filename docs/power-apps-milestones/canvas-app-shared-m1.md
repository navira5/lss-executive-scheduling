# Milestone 1 shared Canvas state

## Canonical collections

- `colCalProofEvents`: occurrences across plan years; views filter `PlanYear=varPlannerYear`.
- `colCalProofClosures`: verified holidays, closures, and user-created blocks.
- `colPlannerExclusions`: generated occurrence exclusions.
- `colPlannerHistory`: append-only local audit receipts.
- `colPlannerUndo`: one typed snapshot for the immediately previous mutation.

## Shared variables

- Navigation: `varPlannerYear`, `varPlannerView`, `varPlannerFocusedDate`, `varPlannerSelectedEventId`.
- Filters: `varPlannerShowBoard`, `varPlannerShowCommittees`, `varPlannerShowExecutive`, `varPlannerShowOperations`.
- Context: `varPlannerContextMode`, `varPlannerSelectedClosureId`, `varPlannerReceipt`.
- Draft: name, layer, category, date, start time, duration, warning acknowledgment, override reason, and dirty state.

## Mutation behavior

- Add and move validate against the same hard-stop and warning rules.
- Blocking a date previews impacted meetings, adds one year-scoped hard stop, and proposes the next valid business date for each impacted occurrence with `NeedsReview` status.
- Removing a block or overriding a verified holiday never repositions adjusted meetings automatically; the receipt recommends regeneration/review.
- Undo restores the immediately preceding mutation when safe. A restored invalid placement is not silently applied.
