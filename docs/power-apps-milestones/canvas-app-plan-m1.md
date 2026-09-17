# Milestone 1 Canvas implementation plan

## Scope

Build the complete local calendar-management workspace before returning for product review:

- Select any plan year from 2026 through 2036.
- Switch seamlessly among Year, Month, and Week projections.
- Filter visible layers independently from workflow progress.
- Add, move, delete, and undo meetings.
- Create and remove user blocks.
- Mark a verified holiday open for one plan year with an auditable reason.
- Treat weekends, active holidays, active closures, and active user blocks as hard stops.
- Treat planned overlaps and cadence deviations as warnings that require acknowledgment.
- Preserve unsaved editor values while switching views.

## Physical-screen decision

Milestone 1 uses three streamlined physical screens: `CalendarPlanner`, `CalendarPlannerMonth`, and `CalendarPlannerWeek`. They are not extensions of the over-complex `AnnualCalendarProof`; the old proof remains intact as a regression reference. The three screens share one state model, canonical occurrence collection, selected meeting, filters, visual language, and contextual actions, so the segmented control still feels like a view switch rather than navigation to another product area. Add/block and closure administration return to the Year screen's full editor; direct selection and move remain available in every view.

## State and data invariants

- `colCalProofEvents` is the only mutable occurrence collection.
- All three calendar views filter and project `colCalProofEvents`; no view-specific event collection exists.
- `colCalProofClosures` is the only mutable hard-stop collection.
- View changes update `varPlannerView` only. Draft controls are bound to shared variables and are not reset on view change.
- Every mutation creates an undo snapshot and a visible receipt.
- Manual meeting deletion removes the occurrence; generated meeting deletion creates an exclusion and removes the occurrence locally.
- Verified holidays are never physically deleted. They are deactivated for the selected year with a required reason and audit fields.

## Validation contract

1. Hard stop: weekend, active holiday/closure, or active user block. Save/confirm is disabled.
2. Warning: overlap with another planned occurrence or moving a generated occurrence away from cadence. The user must explicitly acknowledge before confirmation.
3. Valid: no hard stop or warning. Confirmation is enabled.

## Verification gate

Compile all YAML, run App Checker and accessibility checks, then exercise M1-01 through M1-16 in the actual Power Apps player. No Outlook action, SharePoint write, or publishing action is in scope.
