# Shared state contract

- `colMeetingRulebook`: one editable source for all meeting rules, keyed by `RuleId`.
- `colCalProofEvents`: one canonical event source for year/month/week and the side panel, keyed by stable `EventId`.
- `colPlannerLayerState`: ordered state for Board, Board Committees, Executive Leadership, and Organization & Operations.
- `colPlannerLayerPreview` / `colPlannerLayerPreviewBlocked`: proposed generation result for the active layer.
- `colPlannerExclusions`: generated occurrences deliberately removed so regeneration does not recreate them.
- `colPlannerHistory` / `colPlannerUndo`: visible local audit and immediate undo state.

Layer order is authoritative. A layer can be built only after the previous layer is confirmed. Reopening or changing an earlier layer marks every later layer `Needs revalidation`. Later layers may warn about overlaps but may not modify confirmed earlier-layer events.

Hard stops are weekends, active LSS holidays, and user-created blocked days. Generated dates move forward to the next valid business day and remain `NeedsReview` until approved or manually changed.
