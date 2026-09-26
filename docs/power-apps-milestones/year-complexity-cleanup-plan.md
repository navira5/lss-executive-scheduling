# Year-view complexity cleanup candidate — 2026-09-25

This plan was approved and its exact 14-control source edit was implemented
on 2026-09-25. Before editing, a fresh live sync matched all six checked-in
YAML files byte-for-byte. App Checker confirmed Year complexity **313** (down
from an earlier 363) and 24 medium performance findings. After the edit,
App Checker reported 22 medium findings and no Year control-count warning.
It did not report a new below-threshold numeric estimate. None of these
checker results is a measured runtime interaction time.

## Canvas Edit Plan

### Screens to Modify

| Action | Screen | File | Summary |
| --- | --- | --- | --- |
| Modify | `CalendarPlanner` (Year) | `CalendarPlanner.pa.yaml` | Remove only the 14 permanently hidden, statically unreachable controls listed below. Retain all visible Year overview and navigation controls and all hidden workers reached by `Select`. |

### Screens to Add

None.

### App Changes

None. Do not change `App.pa.yaml`, data sources, rule logic, IDs, or persisted
planning records.

### Functional Changes

| Capability | Existing behavior | Required transition | Visible success |
| --- | --- | --- | --- |
| Year overview | 12-month read-only grid with layer filters, flags, compact selection, and `Open in Month`; hidden editing branches still occupy source/control complexity. | Remove unreachable hidden branches without changing the authoritative event collections or any visible action. | Same 12 months, counts/chips/flags, filters, selected-event summary, and `Open in Month` navigation before and after. |
| Month/Week editing | Add, Block, Move, Delete, Reset confirmation, Needs attention, and Undo are on dedicated Month/Week screens or routed through retained Year workers. | No behavior change. Retain all reachable workers, especially persistence, hydration, Add-all, recomputation, and Undo. | Existing Month/Week actions and return-view behavior still work; saved data survives a reopen. |

### Exact removal candidate

| Permanently hidden branch | Controls to remove | Static reachability evidence |
| --- | --- | --- |
| `conPlanYrCalendarToolbar` | `conPlanYrCalendarToolbar`, `conPlannerActions`, `btnPlannerAddMeeting`, `btnPlannerBlockDay` | The parent and inner container both have `Visible=false`. The Add handler is called only by hidden `btnPlannerCalendarAddMeeting`; the Block handler only by hidden `btnPlannerCalendarBlockDay` and `btnPlanYrDateBlock`. |
| `conPlannerBoardWorkflowSummary` | `conPlannerBoardWorkflowSummary`, `conPlannerBoardWorkflowActions`, `btnPlannerPreviewBoardDraft` | The parent has `Visible=false`; no other synced YAML formula references `btnPlannerPreviewBoardDraft`. Its long preview-generation formula is an App Checker warning source, but removal is not assumed to produce a particular score reduction. |
| Hidden Year action buttons | `btnPlannerCalendarAddMeeting`, `btnPlannerCalendarBlockDay`, `btnPlanYrDateBlock`, `btnPlannerApprove`, `btnPlannerMove`, `btnPlannerDelete`, `btnPlannerEditSourceRule` | Each has `Visible=false`. The first three call only the hidden Add/Block handlers above. The selected-meeting buttons have no cross-file `Select`/property references in the synced YAML. |

This is **14 controls total**, not a prediction of a 14-point improvement.
Static search does not prove runtime safety; compile and live navigation tests
are required after the edit.

### Explicit keep list

- `btnPlannerPersistYear`, `btnPlannerHydrateYear`, `btnPlannerRecomputeImpact`,
  and `btnPlanYrAddAllRules` are hidden but called programmatically. Do not
  remove them.
- `conPlanYrMutationReceipt` is hidden but contains `btnPlannerUndo`; visible
  `btnPlannerTopUndo` calls that handler. Do not remove either control as part
  of this cleanup. Reset/Undo has separate known defects and is not fixed by
  reducing Year controls.
- Keep `conPlannerCalendarActions` and its Add-from-rules worker, Year date
  selection, attention/flag rendering, layer filters, compact inspector,
  `Open in Month`, Month and Week screens, and Rule Book navigation.

### Approach and acceptance

Make a reversible source checkpoint, remove only the named controls, compile
all six files, sync back to the coauthoring session, and verify that the
synced result matches the intended source. Do **not** publish. In Studio/player,
test Year opening with all 12 months; filter toggles; a flagged and an ordinary
meeting; `Open in Month` with the same selected `EventId`; Month→Week→Year;
Needs attention focus; Add-from-rules return to the initiating view; and
Reset confirmation **Cancel** in Month and Week. Compare the same saved 2027
and 2028 record counts before and after, and reopen both years to verify
hydration. Do not click destructive Reset/Delete on shared data.

Measure the Year App Checker estimate and actual Year opening/selection/filter
response on the same browser and dataset before and after. Report them
separately. The browser-control connection did not respond during the earlier
audit, so no runtime-performance result is claimed for that pass.

### Additional live, non-destructive check — 2026-09-25

After the Mac was unlocked, Studio preview was reachable again. The existing
Month screen showed 2027 saved counts of Board 10, Committees 20, Executive
64, Operations 11, and One-time 0. Navigating to Year showed the 12-month
calendar. Selecting the January 4 Executive Team Meeting displayed its
read-only Year detail (1:00–3:00 PM, Ready) with **Open in Month** and no
Year-side Move/Delete action. **Open in Month** reached the January Month
screen with that same meeting selected; Move and Delete were available in its
right context panel. This verifies that path in the current, unmodified app,
not the proposed 14-control removal or a performance improvement. Week
navigation was attempted but not verified because Chrome's active tab changed
while the check was running. No meeting mutation, Reset, or Publish occurred.

### Follow-up live checks — 2026-09-25

With Studio preview back on the Power Apps tab, Month → Week opened
`CalendarPlannerWeek`. Advancing to January 4–10 and selecting the January 4
Executive Team Meeting displayed its 1:00–3:00 PM details and Move, Delete,
and Edit source rule actions in the Week context panel. Week → Month returned
to January with the same meeting selected in the Month context panel.

In **both Month and Week**, the toolbar's Add meeting action opened the Add
meeting form inside the right context panel while the calendar remained
visible. Cancel discarded the draft. Block day likewise opened its date and
reason fields in the right context panel, and Cancel returned without saving.
The Week Needs attention action navigated to the June 1 generated Executive
Team Meeting, showed **Needs approval**, the Memorial Day shift explanation,
and the available actions. This proves that one flagged-meeting focus path;
it does not prove that every flag or resolution works.

These were navigation and form-opening checks only. No meeting was added,
blocked, moved, deleted, approved, reset, or published. Reset → Undo, full
flag-resolution coverage, responsiveness measurements, and the proposed
14-control Year cleanup remain unverified/pending.

### Implementation receipt — 2026-09-25

The user approved this specific removal. The synced `CalendarPlanner.pa.yaml`
changed by **324 deletions, zero additions**; parsed controls dropped from 147
to 133. The diff removed exactly the 14 named controls and changed no property
of a retained control. Exact-name search found no leftover references to the
removed nodes; the explicit keep-list workers and visible Year/Month/Week
routes remain in source. `compile_canvas` passed all six files. A new empty
verification directory was synced from the live coauthoring session, and its
Year YAML matched the edited working copy byte-for-byte. App Checker dropped
from 24 to 22 medium findings and no longer reported `ScreenHasManyControls`
for Year.

The browser-control connection timed out twice, so post-edit Studio/player
click-through tests, actual interaction timing, and 2027/2028 hydration counts
were **not** reverified. The previously observed runtime checks above were
pre-edit and must not be represented as post-edit evidence. The Canvas skill's
packaged acceptance validator script was absent from the installed plugin, so
the formal acceptance-artifact validator could not run; compilation and server
round-trip are the confirmed technical checks. No Reset, Delete, Outlook
connection, or Publish was performed. The prior published version may still be
older than this coauthoring source.

Next: run the non-destructive live regression checks listed in “Approach and
acceptance” and compare Year opening/selection/filter responsiveness on the
same browser and dataset. Do not publish based solely on App Checker. A
separate user decision remains necessary for a disposable app plus isolated
SharePoint test data to repair/test Reset→Undo; this approval did not cover it.
