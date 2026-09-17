# Milestone 3 — Cohesive planning workflow

## Outcome

One testable job from a clean 2027 plan: select each planning layer, review and edit its rules, build an idempotent draft, resolve date decisions in the calendar side panel, confirm the layer, reopen an earlier layer, regenerate safely, and see downstream layers require revalidation.

## Screen ownership

| Screen | Responsibility |
|---|---|
| CalendarPlanner | Layer progression, reset-to-blank, preview/apply/confirm/reopen, shared year calendar, shared side-panel mutations, final review |
| BoardRulesReview | Rule list and rule editor for the active planning layer |
| CalendarPlannerMonth | Shared month view of the same events and layer visibility |
| CalendarPlannerWeek | Shared week view of the same events and layer visibility |

## Functional Test Matrix

| # | Given | When | Then | Evidence |
|---|---|---|---|---|
| 1 | Seeded local plan | Start a clean plan is confirmed | Generated and manual meetings for 2027 are removed; closures and rules remain | Empty calendar plus reset receipt |
| 2 | Board is active | Open rules, confirm/edit, return, preview and apply | Board dates are generated from current rules exactly once | Layer status and generation receipt |
| 3 | A generated meeting is selected | Approve, move, or delete/exclude | Calendar and side panel update immediately; source/original date stays available | Mutation receipt and updated chip |
| 4 | Board is complete | Confirm Board | Board locks and Committees becomes eligible | Layer status row |
| 5 | Committees/Executive/Operations becomes eligible | Build the layer twice | Second build replaces only generated occurrences for that layer and creates no duplicates | Stable EventId count and layer receipt |
| 6 | Earlier confirmed meetings exist | A later layer generates an overlap | The date remains but is flagged for review as a cross-layer warning | Side-panel reason and needs-approval state |
| 7 | A layer is confirmed | Reopen that layer or save one of its rules | That layer needs regeneration and every later layer is marked needs revalidation | Layer state row and workflow message |
| 8 | A saved manual move or generated exclusion exists | Regenerate the same layer | Manual move, manual meeting, and exclusion are preserved | Preview impact and resulting calendar |
| 9 | All four layers are confirmed and current | Open Final Review | Counts/statuses for all layers are visible; no Outlook/publish action exists | Final review card |
| 10 | User navigates to rules/month/week and back | Return to year view in the same session | Current rules, events, decisions, and layer statuses remain | Same shared collections |

## Scope boundary

This milestone is in-session only. Durable save/resume is Milestone 4. Outlook read/write and publishing remain excluded.
