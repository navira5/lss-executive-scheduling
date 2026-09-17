# Milestone 2 — Board planning verification

## Scope

This milestone completes the local Board planning loop inside the Calendar Planner. It does not implement Committees, Executive, Operations confirmation workflows, Outlook writes, or publishing.

## Review sequence

1. Open the Calendar Planner in Year view. The Board-planning strip must say how many Board rules still need confirmation.
2. Select **Review Board rules**. Confirm or correct every Board rule, including the unresolved Board Orientation Window, then return to the calendar.
3. Select **Preview Board draft**. Verify the preview explains how many dates will be generated, how many need review, and how many approved manual moves, manual meetings, exclusions, and blocked dates will be preserved.
4. Select **Apply Board draft**. The calendar must update immediately without leaving the annual calendar.
5. Review every amber Board date. Approve the proposed date or choose another date/time. The original generated date must remain visible in the meeting history.
6. Move one normal Board meeting, delete one generated Board occurrence, and add one manual Board meeting. Preview and apply the draft again.
7. Verify the approved move remains moved, the excluded occurrence does not return, and the manual meeting remains present.
8. Select **Confirm Board**. Confirmation must be blocked while any Board rule, unplaced date, or Needs review decision remains.
9. Resolve the remaining items and confirm again. The Board receipt must show the year, confirmation time, meeting count, and stable event IDs.
10. After confirmation, verify Board meetings cannot be moved, deleted, regenerated, re-approved, or displaced by blocking their occupied date. Other planning layers must remain unchanged.

## Expected safety behavior

- Holiday and closure dates remain visible and never host a finalized meeting.
- Automatic holiday moves are proposals, not approvals.
- Regeneration replaces only generated Board occurrences for the selected year.
- Regeneration never clears Committees, Executive, Operations, closures, manual meetings, approved moves, or exclusions.
- Repeated preview/apply actions do not create duplicate Board occurrences.
- No Outlook event is created, updated, or deleted.
- The app remains unpublished.

