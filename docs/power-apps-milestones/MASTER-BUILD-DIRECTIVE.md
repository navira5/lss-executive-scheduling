# LSS Calendar Planner — Master Build Directive

**Status:** Governing implementation contract, accepted September 16, 2026
**Product owner direction:** Build complete user outcomes, not isolated controls.
**Source of truth order:** this directive → meaningful original POC behavior → approved PRD/rulebook → current Canvas implementation.

## Product outcome

Felise can return after months away and, without technical help, understand where she stopped, maintain rules, generate the year, see every meeting, add/move/delete meetings, block dates, resolve holidays, approve exceptions, confirm each planning layer, review conflicts, and safely publish approved meetings to Outlook.

The calendar is the product. SharePoint is storage. Rules are configuration. Outlook is the live destination. The interface must not expose SharePoint, Power Fx, recurrence formulas, IDs, Graph, connectors, or underlying storage concepts to the planning user.

## Required workflow

Choose planning year → continue current layer → review rules → build meetings → inspect the whole calendar → resolve exceptions → manually adjust → confirm layer → continue through remaining layers → final review → publish approved meetings.

## Operating rules

- Work in milestone-sized user capabilities; never return for control-by-control testing.
- Within an approved milestone, proceed autonomously unless an irreversible production action, Outlook write authority, a material platform limitation, or a product-changing architecture decision is required.
- Preserve meaningful POC capabilities even when an earlier PRD omitted them, unless the product owner explicitly removes them.
- When Power Apps cannot reproduce an interaction exactly, preserve the user outcome with the closest native interaction.
- Never publish or write to Outlook before the Outlook publishing milestone is explicitly authorized.
- Do not use the user as first-line QA.

## Product structure

1. **Planning Home** — year, active layer, progress, outstanding decisions, sync status, and one primary action.
2. **Calendar Planner** — the primary workspace with Year/Month/Week views, layer filters, selected-event context, decisions, and calendar management.
3. **Outlook Review** — exact create/update/match/conflict counts and controlled publishing after all planning layers are complete.

## Planning layers

1. Board
2. Board Committees
3. Executive Leadership
4. Organization & Operations
5. Final Review / All Layers

The active planning step and visible layer filters are independent state. Changing a filter must never generate, clear, confirm, or reopen a layer.

## Shared engines

- One deterministic recurrence engine powers every layer.
- One hard-stop validation path is used by generation, add, move, regeneration, and holiday adjustment.
- Hard stops include prohibited weekends, official holidays, office closures, user-created blocked dates, and other absolute blackouts.
- No meeting may be finalized on a hard stop.
- Automatic holiday moves remain **Needs approval** until a person approves or chooses another placement.
- Regeneration preserves manual meetings, approved manual moves, exclusions, closures, and blocked dates.

## Milestones

### Milestone 0 — Parity audit and foundation

Deliver and maintain the POC, PRD, and current Power App capability inventories; parity ledger; state model; data model; missing functionality; and documented Power Apps compromises. No user testing.

### Milestone 1 — Complete calendar workspace

One end-to-end capability: manually manage a plan calendar without rule generation.

- Dynamic 2026–2036 year selection
- Year, Month, and Week views over the same plan state
- Independent planning-layer filters
- Selected-event panel
- Add, move, delete/exclude, and undo
- Block day and remove/deactivate block or holiday
- Holiday rendering and shared hard-stop validation
- Immediate synchronization across all three views

Year, Month, and Week are one user workspace but may use separate physical Canvas screens when that materially reduces control complexity. Any screen split must preserve the shared header, theme, selected meeting, filters, context behavior, and the feel of a simple `Year | Month | Week` view switch.

There is exactly one canonical in-memory occurrence collection for the selected plan year. Every calendar view is a projection of that collection; no view may maintain a private meeting copy.

Hard stops are verified holidays, closures, user-created blocked dates, and prohibited weekends. They cannot be confirmed. Planned-meeting overlaps, future Outlook overlaps, and movement away from preferred cadence are warnings unless a later approved rule explicitly upgrades them; warnings require explicit acknowledgment but may be accepted.

User-created blocks use **Remove block**. Verified holidays use **Mark this holiday as open for [year]**, require a reason, remain auditable, and are never physically deleted from the canonical holiday definition.

### Milestone 2 — Complete rule foundation and Board end-to-end

One end-to-end capability: review Board rules → build Board draft → review exceptions → move meetings → approve adjustments → preview regeneration impact → regenerate safely → confirm Board.

- Complete documented rule inventory, including unresolved and unscheduled groups
- Human-readable summaries and simplified rule editor
- Board generation and holiday auto-adjustment
- Compact approval queue
- Manual override and exclusion preservation
- Conflict handling and confirmation gates

### Milestone 3 — Complete planning layers

Extend the shared engine through Board Committees, Executive Leadership, Organization & Operations, and Final Review, including precedence, dependencies, protected earlier layers, independent visibility filters, cross-layer conflicts, reopening, and downstream revalidation.

### Milestone 4 — Persistence and resume

Persist plans, rules, meetings, closures, exclusions, decisions, and change history in SharePoint. Closing and reopening the browser must resume exactly where the user stopped. Support independent multi-year plans and recoverable errors.

### Milestone 5 — Outlook read context

Refresh Outlook independently of planning; show existing events in muted gray, last-sync time, graceful failure, and read-only conflicts. No Outlook mutations.

### Milestone 6 — Final review and Outlook publishing

Refresh before publish, compare planned and current Outlook state, preview exact creates/updates/matches/conflicts, prevent duplicates, publish only approved changes, verify results, and never auto-delete Outlook events.

### Milestone 7 — Multi-calendar executive scheduling

Phase 2 only after Phase 1 acceptance: compare Rachel, Kim, organizational, and other required calendars; recommend explainable alternatives; require human approval; never autonomously reschedule.

## Definition of done

A milestone is reviewable only when:

1. Every defined capability exists and the complete user job works end-to-end.
2. Happy, invalid, blocked, empty, destructive, undo, and recovery paths work.
3. Required state persists and every relevant view updates consistently.
4. No blank, technical, placeholder, or obviously unfinished surface remains.
5. Earlier milestones still work.
6. The actual Power Apps player has been exercised.
7. Responsive behavior, accessibility checks, and performance checks have been run.
8. Known limitations and POC parity status are documented.

## Review package

Return only after the milestone passes its internal gate. Include completed capabilities, no more than ten coherent test scenarios, screenshots or recording, known limitations, and a POC parity table showing matched, adapted, deferred, and platform-blocked behavior.
