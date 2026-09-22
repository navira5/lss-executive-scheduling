# LSS Calendar App — Canvas source snapshot

This directory records the earlier saved Canvas App source from the Power Apps authoring session through 2026-09-16.

The current month-first clone is preserved separately in
`../lss-calendar-month-first-test-clone/`. Do not treat this older directory as
the latest clone or overwrite it when testing the current app.

- The app was **not published** as part of this snapshot.
- This is a working draft for product-owner review; it does not indicate that the complete multi-layer product is approved.
- Milestone 1 adds a dynamic 2026–2036 calendar-management workspace with separate Year, Month, and Week screens over one canonical occurrence collection.
- The workspace includes independent Board/Committees/Executive/Operations visibility filters; add, move, delete/exclude, and one-step undo; hard-stop validation; acknowledged warnings; user-created blocks; year-specific audited holiday overrides; and crowded-day handling.
- Milestone 2 completes the local Board planning loop on the real Calendar Planner: review all Board rules, preview deterministic draft impact, safely apply regeneration, preserve approved manual moves and exclusions, route automatic holiday adjustments to human review, and confirm/lock Board only when every gate passes.
- The Board rule editor remains available from the calendar and returns to the same workspace. Manual moves resolve only the date adjustment; they do not confirm the source rule or the Board layer. A confirmed Board occurrence cannot be moved, deleted, approved again, overwritten by regeneration, or shifted by blocking its date unless Board planning is explicitly reopened through a rule change.
- Full later-layer rule authoring, SharePoint persistence, Outlook read/write behavior, final publishing, and downstream workflow confirmation remain intentionally outside the current milestone.
- `_EditorState.pa.yaml` is intentionally excluded because Power Apps Studio owns that file.
- The files are retained here so the Canvas work can be reviewed in Git alongside the LSS scheduling prototype.
