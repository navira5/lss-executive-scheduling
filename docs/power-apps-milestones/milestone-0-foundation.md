# Milestone 0 — Parity Audit and Foundation

**Completed:** September 16, 2026
**Canvas working directory:** `/Users/naviraabbasi/Documents/Codex/2026-09-15/referenced-chatgpt-conversation-this-is-an/slice6-single-approval-card`
**Live session sync:** successful; 8 YAML files pulled before assessment.

## 1. Current Power App capability inventory

### Current start experience

- `App.StartScreen` points to `AnnualCalendarProof`.
- The current primary workspace is a 2027 Board calendar with twelve real month grids and a right context panel.
- The user can open the Board rule review, edit the three Board rule records, generate a Board draft, select a meeting, review holiday adjustments, choose another date/time, undo a move, and confirm Board when gates permit.
- The current rule collection contains only `BOARD-FULL`, `BOARD-CHECKIN`, and `BOARD-RETREAT`.
- Current shared state, generated dates, closures, validation, and labels are hard-coded to 2027.

### Existing but incomplete/legacy screens

| File | Apparent role | Foundation decision |
|---|---|---|
| `AnnualCalendarProof.pa.yaml` | Current calendar workspace | Preserve and restructure as the Calendar Planner shell |
| `BoardRulesReview.pa.yaml` | Current Board rule editor | Preserve for Milestone 2; bind to canonical rule library |
| `Screen1.pa.yaml` | Earlier planning hub/readiness prototype | Reconcile into Planning Home in Milestone 4 or replace after behavior is preserved |
| `MainScreen1.pa.yaml` | Earlier Board rule prototype | Retire after confirming no unique behavior remains |
| `Screen2.pa.yaml` | Earlier Board annual summary/confirmation prototype | Retire after unique receipts/gates are migrated |
| `MeetingEditorScreen.pa.yaml` | Earlier date-adjustment screen | Retire after contextual-panel parity is verified |

No screen will be deleted until its unique actions, receipts, and test cases are mapped to the surviving architecture.

## 2. POC and PRD inventories

The detailed capability comparison is maintained in `poc-parity-ledger.md`. The focused PRD gap review is maintained in `../ux-audit-poc-prd-coverage-2026-09-16.md`.

Key conclusion: the PRD covers the core rules-first planning engine and safe approval model, but it does not completely specify calendar CRUD, user-managed hard stops, holiday deactivation, view switching, independent layer filters, dynamic years, complete rule-catalog acceptance, or rule-group lifecycle management.

## 3. Canonical state model

### Global navigation and session state

| State | Purpose |
|---|---|
| `SelectedPlanYear` | Active year, integer 2026–2036 |
| `ActivePlanningLayer` | Layer currently being built |
| `VisibleLayers` | Independent set of layers displayed |
| `CalendarView` | `Year`, `Month`, or `Week` |
| `FocusedDate` | Anchor date for Month/Week views |
| `SelectedMeetingId` | Stable occurrence identity shared across views |
| `ContextMode` | Summary, move, add, delete confirmation, block-day, approval, or rule context |
| `LastSyncAt` / `SyncStatus` | Read-only Outlook context state |
| `LastMutation` | Typed snapshot supporting the relevant undo path |

### Plan state

| State | Purpose |
|---|---|
| Plan status | Draft, in progress, confirmed, ready for Outlook review, published |
| Layer status | Locked, available, in progress, needs decisions, confirmed, stale |
| Rule status | Confirmed, baseline, needs validation, open question, inactive |
| Meeting source | Generated, manual, imported Outlook |
| Meeting decision | Ready, needs approval, approved adjustment, warning, blocked, excluded |
| Change status | Proposed, applied, undone, superseded |

### Separation invariants

- Confirming a date adjustment does not confirm its rule or layer.
- Confirming a rule does not confirm a layer.
- A view filter never changes planning state.
- Reopening an earlier layer does not silently edit downstream meetings; it marks affected downstream layers stale.
- An exclusion suppresses a generated occurrence without changing its recurrence rule.
- Deactivating a closure/holiday does not silently move previously adjusted meetings back.
- Changing year switches plan scope and never overwrites another year's state.

## 4. Canonical data model

| Entity | Stable identity | Minimum fields for the approved roadmap |
|---|---|---|
| Plans | `PlanId` | Year, status, active layer, owner, version, timestamps |
| Plan Layers | `PlanLayerId` | PlanId, layer, status, confirmation actor/time, stale reason |
| Rules | `RuleId` | Name, layer, cadence, week/day/time/duration, holiday behavior, status, effective start/end year, source evidence |
| Rule Months | `RuleMonthId` | RuleId, month number, active flag |
| Planned Meetings | `MeetingId` | PlanId, RuleId nullable, SourceType, layer, original/current date/time, duration, status, override metadata, actor/time |
| Closures | `ClosureId` | PlanId/year, date, name, type, hard-stop flag, active flag, source, actor/time |
| Dependencies | `DependencyId` | Upstream/downstream rule or meeting, minimum/maximum gap, severity |
| Exclusions | `ExclusionId` | PlanId, RuleId, occurrence key/original date, reason, actor/time, active flag |
| Decisions | `DecisionId` | Subject type/id, proposed value, decision status, reason, actor/time |
| Change History | `ChangeId` | Subject type/id, action, before/after snapshot, actor/time, undo/supersession link |
| Outlook Links | `OutlookLinkId` | MeetingId, Outlook event ID, calendar ID, last verified state |

Manual meetings have `RuleId` blank and `SourceType=Manual`. Generated occurrences use a deterministic occurrence key so exclusions and overrides survive regeneration.

## 5. Shared engine contracts

### Date validation

Input: candidate date/time, year, duration, hard-stop set, planned events, read-only Outlook context.
Output: `Valid`, `Warning`, or `HardStop`; plain-English reason; nearby valid alternatives.

The same contract must be called by add, move, generation, regeneration, and automatic adjustment.

### Generation

Input: active confirmed rules, selected year, closures/blocks, dependencies, exclusions, manual overrides.
Output: proposed/generated occurrences, proposed adjustments, unresolved decisions, conflicts, and an impact receipt.

Generation may replace regenerable occurrences for the targeted layer/year only. It must preserve manual meetings, approved overrides, exclusions, closures, blocked dates, and confirmed earlier layers.

### Undo

Undo restores the immediately previous relevant state and decision status. If the restored placement is now invalid, the app shows validation and requires confirmation instead of applying silently.

## 6. Known Power Apps adaptations and compromises

| POC interaction | Native Power Apps outcome |
|---|---|
| Drag meeting to a date | Select meeting → Move meeting → choose date/time → live validation → confirm |
| Hover details | Select/tap opens contextual detail |
| Dense event chips | Year shows limited chips plus `+N`; Month/Week expose complete detail |
| Browser-local standalone state | Local collections for capability milestones, then SharePoint persistence in Milestone 4 |
| Natural-language agent | Deferred product decision; deterministic controls and engine remain authoritative |
| Rich responsive web layout | Native auto-layout containers with explicit desktop/tablet/phone behavior and reduced per-screen control count |

## 7. Verified baseline quality

### Compile

- Canvas validation: **passed** across all 8 synced YAML files.

### App checker

- 11 medium performance findings.
- `AnnualCalendarProof` estimated complexity is 326, above the recommended 300 threshold.
- Unused variables remain from earlier prototypes.
- Several read-only collections should become named formulas.
- Several generators mutate collections inside `ForAll` and need batched collection construction.

### Accessibility

- 3 errors: missing tab stops on legacy `Screen2` galleries.
- 2 suggestions: rename `Screen1` and `Screen2` to meaningful screen names.

These issues are baseline defects, not accepted debt. Milestone work must not add new checker findings and must remove affected findings when touching the owning screen.

## 8. Milestone 1 implementation boundary

Milestone 1 owns manual calendar management only. It may use compact local collections, but every record must already carry stable IDs and the canonical fields needed for later persistence. It must not implement SharePoint, Outlook writes, later-layer generation, or publishing.

Milestone 1 is complete only when the user can select any year from 2026 through 2036, manage meetings and hard-stop dates, and see identical state reflected in Year, Month, and Week views without leaving the calendar workspace.

## 9. Milestone 1 action contracts

| Action | Preconditions | Source transition | Visible proof |
|---|---|---|---|
| Change year | No unsaved editor mutation, or user confirms discard | `SelectedPlanYear` changes; year-scoped collections reload without overwriting another year | Header, grids, closures, and meeting counts all show selected year |
| Switch view | Plan loaded | `CalendarView` changes only | Same selected meeting/date/filter state appears in target view |
| Filter layers | Plan loaded | `VisibleLayers` changes only | Visible meeting set changes; workflow progress is unchanged |
| Select meeting | Visible meeting exists | `SelectedMeetingId` set to stable ID | Context panel shows exact name/date/time/source/status |
| Add meeting | Required fields valid; placement not hard stop | Add one `SourceType=Manual` record with stable ID | Bound receipt shows every entered field; meeting appears in all views |
| Move meeting | Editable occurrence selected; new placement valid or warning accepted | Snapshot previous values; update current date/time and adjustment metadata | Receipt states old/new placement; all views update immediately |
| Delete meeting | Editable occurrence selected; destructive confirmation accepted | Manual record removed or generated occurrence excluded; snapshot stored | Meeting disappears in all views; receipt and Undo visible |
| Undo | Compatible last mutation exists | Restore typed snapshot; revalidate if placement may now be invalid | Restored state visible in every view or confirmation required |
| Block day | Date and reason supplied | Add active year-scoped hard stop; create proposed adjustments for affected meetings | Closure rendered; impact count and adjustment queue shown |
| Remove block/holiday | Authorized active closure selected; confirmation accepted | Soft-deactivate for selected plan year; preserve prior meeting decisions | Closure disappears; receipt says regeneration recommended; Undo visible |

## 10. Milestone 1 functional test matrix

| ID | Given | When | Then and evidence |
|---|---|---|---|
| M1-01 | 2027 plan and meeting selected | Switch Year → Month → Week | Same MeetingId remains selected; each view shows its current date/time |
| M1-02 | Independent sample plans for 2026 and 2027 | Change years twice | Each year restores its own meetings, blocks, and selection without overwrite |
| M1-03 | Leap-year capable date generator | Select February 2028 | Feb 29 appears in correct weekday cell |
| M1-04 | Board and Executive sample meetings | Toggle Board only | Executive hides; active planning layer/progress does not change |
| M1-05 | Empty valid business date | Add manual meeting | Receipt shows name/layer/date/time/duration/category; event appears in all views |
| M1-06 | Holiday or blocked date | Attempt add | Save disabled; hard-stop reason and valid alternatives shown |
| M1-07 | Normal meeting | Move to valid date/time | Old/new receipt appears; every view updates without navigation/refresh |
| M1-08 | Meeting and overlapping event | Move into overlap | Warning is explicit; hard stops remain non-confirmable |
| M1-09 | Generated occurrence | Delete and regenerate sample state | Exclusion prevents recreation; undo restores occurrence |
| M1-10 | Date with three meetings | Block day | Impact preview shows three; proposed alternatives enter Needs approval |
| M1-11 | User-created block | Remove and undo | Block disappears, adjusted meetings do not silently move back, undo restores block |
| M1-12 | Verified holiday | Deactivate for selected year | Reason/audit retained; other years unchanged; regeneration recommended |
| M1-13 | Four events on one date | View Year then Month/Week | Year shows limited chips + count; Month/Week show all four |
| M1-14 | No meetings in selected filters/range | Open each view | Helpful empty state and Add meeting action appear |
| M1-15 | Prior Milestone 0 Board interactions | Complete move/approval/undo path | Existing path still works with shared state and no duplicate records |
| M1-16 | Unsaved add/move/block edit in progress | Switch Year/Month/Week and return | Draft values are preserved, or an explicit discard confirmation appears; no field is silently lost |

## 11. Milestone 0 gate result

**PASS — approved by the product owner.** The governing contract, POC parity ledger, current Power App inventory, state model, data model, engine contracts, compromise log, baseline checker results, Milestone 1 action contracts, and Milestone 1 deterministic test matrix now exist beside the YAML-only Canvas workspace. Milestone 1 includes test M1-16 and the approved state, warning, screen-complexity, and holiday-override clarifications.

## Milestone 1 implementation status

**READY FOR PRODUCT-OWNER REVIEW — September 16, 2026.** The complete local calendar-management workspace is implemented and compiled: dynamic 2026–2036 planning years, separate Year/Month/Week Canvas screens over one occurrence collection, independent layer visibility, add/move/delete/exclude/undo contracts, hard-stop and warning validation, user blocks, audited year-specific holiday overrides, crowded-date handling, and preserved unsaved drafts. See `milestone-1-verification.md` for live-player evidence and known debt.
