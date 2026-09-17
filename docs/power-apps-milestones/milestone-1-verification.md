# Milestone 1 — Calendar-management verification

**Date:** September 16, 2026
**App:** LSS Calendar App, saved and unpublished
**Scope:** local Calendar Planner only; no Outlook action, SharePoint write, or publish

## Outcome

Milestone 1 is ready for product-owner review. Year, Month, and Week are separate physical Canvas screens over one canonical occurrence collection. The live player was used to verify the primary workspace, editing, hard-stop, warning, crowded-date, and navigation paths. Canvas YAML compilation passed for all 11 app files.

Two defects found during player QA were corrected before handoff:

1. Move receipts were reading the patched date as both the old and new date. The mutation now snapshots prior scalar values before `Patch`.
2. Week day cards and the Board-rules workspace were clipped by parent sizing. Week now uses the available vertical height, and the rules workspace calculates its own non-circular height.

## Deterministic matrix

| Test | Result | Evidence |
|---|---|---|
| M1-01 | Pass | Selected event and focused date persisted across Year → Month → Week; all views read the same EventId. |
| M1-02 | Pass | 2026 and 2027 sample plans remained isolated when switching years; 2036 rendered independently. |
| M1-03 | Pass | Leap-year calendar generation was verified with February 29 in 2036. |
| M1-04 | Pass | Board, Committees, Executive, and Operations visibility toggles independently filtered the same occurrence collection. |
| M1-05 | Pass | A manual 2036 meeting appeared immediately in Year, Month, and Week without a source rule. |
| M1-06 | Pass | January 1 add attempt showed the New Year's Day hard-stop reason and disabled Save. |
| M1-07 | Pass | Full Board moved Jan 12 → Jan 13 immediately; receipt preserved Jan 12 as the generated date; Undo restored Jan 12. |
| M1-08 | Pass | Cadence-deviation warning required explicit acknowledgment before Confirm move became enabled; no-op move stayed disabled. |
| M1-09 | Implemented; formula-verified | Generated deletion creates an exclusion and typed Undo snapshot. Final destructive click was intentionally left for owner review. |
| M1-10 | Pass | Blocking Feb 9 previewed exactly four affected meetings; blocking Jan 12 proposed Full Board on Jan 13 with Needs approval and preserved Jan 12. |
| M1-11 | Implemented; formula-verified | User block removal soft-deactivates the block, leaves adjusted meetings proposed, and offers typed Undo. Final destructive click is left for owner review. |
| M1-12 | Implemented; UI/formula-verified | Verified holiday showed “Mark open for 2027”; reason was required and retained for audit. Final deactivation is left for owner review. |
| M1-13 | Pass | Year showed one chip plus `+3`; Month and corrected Week view visibly stacked all four Feb 9 meetings. |
| M1-14 | Pass | Empty filtered/range states retain an Add meeting action and do not fabricate events. |
| M1-15 | Pass | Board selection, concise context, move, approval status, original generated date, Undo, and Edit source rule remain available. |
| M1-16 | Pass | Unsaved draft values remained intact while switching calendar views and returning. |

## Review scenarios

1. Switch 2027 among Year, Month, and Week; select the Feb 9 Board check-in and confirm the same meeting stays selected.
2. On Feb 9, confirm Year shows `+3` and Month/Week show four vertically stacked meetings.
3. Move Jan 12 Full Board to Jan 13; acknowledge the warning; confirm the receipt says Jan 12 → Jan 13 and Undo restores Jan 12.
4. Try adding a meeting on Jan 1; confirm the hard-stop explanation and disabled Save.
5. Open Block day on Feb 9; confirm the impact preview says four meetings and requires a reason.
6. Select New Year's Day; confirm the verified-holiday override is year-specific and requires a reason.
7. Toggle each layer independently; confirm calendar visibility changes without changing the selected planning year.
8. Open Board rules; confirm all three Board rules and the editor are visible, then use Back to calendar.

## Quality checks and known debt

- Canvas compile: **passed**, 11 files.
- App Checker: 10 medium performance findings, no blocking formula errors. Most are legacy findings on `AnnualCalendarProof`, existing Board generation/confirmation loops, and unused legacy variables.
- Accessibility: three pre-existing missing gallery tab stops on legacy `Screen2`; two legacy screen-name suggestions. The new Calendar Planner galleries define tab stops and accessible labels.
- Persistence remains local to the authoring/player session in this milestone. SharePoint persistence and Outlook read/write behavior remain deferred.
- Full rule inventory and later planning layers remain outside Milestone 1; this milestone supplies the calendar-management workspace and layer visibility foundation only.

## Boundary confirmation

The app remains **saved and unpublished**. No Outlook action was created or executed, and no SharePoint data was written.
