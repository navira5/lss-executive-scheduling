# Milestone 3 — Cohesive planning-layers verification

## Scope

This milestone completes the local, in-session planning job across Board, Board Committees, Executive Leadership, Organization & Operations, and Final Review. It deliberately excludes browser-to-browser persistence, Outlook read context, Outlook writes, and publishing.

## One clean end-to-end test

1. Open **Calendar Planner**, choose **2027**, and select **Start clean** twice. Verify meetings and prior decisions disappear while holidays, closures, and the complete rulebook remain.
2. In **Board**, open **Layer rules**. Verify every Board rule appears, edit one confirmed recurrence field, save, and return to the calendar. Build and apply the Board draft; verify the changed rule drives the dates, a second build does not create duplicates, and hard-stop dates are never used.
3. Select an automatically adjusted Board date. Verify the side panel explains the original date and reason, then approve it. Select a normal meeting and verify the same panel offers **Move meeting**, **Delete meeting**, and **Edit source rule** without unnecessary review UI.
4. Move one generated Board meeting, add one manual Board meeting, and delete one generated occurrence. Build the Board draft again. Verify the manual move, manual meeting, and exclusion are preserved and the original generated date remains available.
5. Resolve the remaining Board decisions and confirm Board. Verify the confirmed layer is protected from move, delete, regeneration, and blocking an occupied date.
6. Open **Committees**. Verify Board remains intact, every committee rule is present, and Committee generation is unavailable until Board is confirmed. Review any unresolved committee rule, build the layer, resolve its proposed dates, and confirm it.
7. Repeat the same workflow for **Executive** and **Operations**. For each layer, verify the first 2027 build uses the Excel-authoritative baseline dates, the calendar shows only the selected layer, and earlier confirmed layers remain protected.
8. Create or acknowledge one cross-layer overlap in a later layer. Verify it appears as a human decision rather than silently replacing an earlier confirmed meeting.
9. Reopen an earlier confirmed layer, change a rule, return to the calendar, and build it again. Verify only that layer is regenerated, its manual decisions are preserved where logical, and every later completed layer changes to **Needs revalidation**.
10. Revalidate and reconfirm the downstream layers, then select **Final review**. Verify all four statuses are visible together, all layers are shown without duplicate occurrences, and the app states that no Outlook changes were made.

## Pass conditions

- The same canonical event collection drives Year, Month, and Week views.
- Layer order and confirmation dependencies are enforced.
- A repeated build replaces generated occurrences for that layer instead of appending duplicates.
- Editing a rule marks its own built layer for regeneration and later completed layers for revalidation.
- Confirmed earlier layers cannot be mutated by later planning.
- Holidays, closures, user blocks, approved moves, manual meetings, and exclusions survive regeneration according to their semantics.
- No Outlook event is created, updated, or deleted, and the app is not published.

## Known milestone boundary

This test must be completed in one Power Apps session. Exact resume after closing the browser is Milestone 4. Outlook read-only context is Milestone 5, and Outlook publishing is Milestone 6.
