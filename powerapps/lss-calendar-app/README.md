# LSS Calendar App — Canvas source snapshot

This directory records the current saved Canvas App source from the Power Apps authoring session through 2026-09-16.

- The app was **not published** as part of this snapshot.
- This is a working draft for product-owner review; it does not indicate that the complete multi-layer product is approved.
- Milestone 1 adds a dynamic 2026–2036 calendar-management workspace with separate Year, Month, and Week screens over one canonical occurrence collection.
- The workspace includes independent Board/Committees/Executive/Operations visibility filters; add, move, delete/exclude, and one-step undo; hard-stop validation; acknowledged warnings; user-created blocks; year-specific audited holiday overrides; and crowded-day handling.
- The Board rule editor remains available from the calendar and returns to the new Calendar Planner workspace. Manual moves resolve only the date adjustment; they do not confirm the source rule or the Board layer.
- Full later-layer rule authoring, SharePoint persistence, Outlook read/write behavior, final publishing, and downstream workflow confirmation remain intentionally outside Milestone 1.
- `_EditorState.pa.yaml` is intentionally excluded because Power Apps Studio owns that file.
- The files are retained here so the Canvas work can be reviewed in Git alongside the LSS scheduling prototype.
