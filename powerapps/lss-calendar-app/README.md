# LSS Calendar App — Canvas source snapshot

This directory records the current saved Canvas App source from the Power Apps authoring session through 2026-09-16.

- The app was **not published** as part of this snapshot.
- This is a working draft for review; it does not indicate that the Board calendar design or behavior is approved.
- The current implemented slice includes the 12-month Board calendar, the local Board rule editor with shared cadence choices and no-typing month selection, Board draft regeneration, and human-reviewed holiday/closure auto-adjustments.
- The Board calendar's contextual panel now supports concise normal-meeting details, approval of automatically adjusted dates, in-place manual date/time moves, immediate calendar refresh, and single-step undo that restores the prior date-decision state. Technical identifiers remain under an optional More details disclosure.
- Manual moves resolve only the date adjustment; they do not confirm the source rule or the Board layer.
- Outlook conflict handling, Board-layer confirmation, Outlook writes, publishing, and later planning layers remain intentionally outside this snapshot's completed scope.
- `_EditorState.pa.yaml` is intentionally excluded because Power Apps Studio owns that file.
- The files are retained here so the Canvas work can be reviewed in Git alongside the LSS scheduling prototype.
