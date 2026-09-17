# LSS Calendar Planner — POC Parity Ledger

**Maintained from:** September 16, 2026
**Status vocabulary:** Matched · Adapted · Partial · Missing · Deferred · Product decision
**Evidence baseline:** live standalone POC, POC source commit `bab99dc`, approved Plan Year specification, Power Apps PRD, MVP 1 rulebook, and synced Canvas app.

| Original POC capability | Required Power App behavior | Current implementation | Deterministic test | Status |
|---|---|---|---|---|
| True 3 × 4 year calendar | Twelve real month grids generated from selected year | `CalendarPlanner` renders twelve real month grids for the selected year | Select 2027; verify Jan–Dec dates and weekday alignment | Matched |
| Year-at-a-glance as primary workspace | Calendar remains primary with contextual panel beside it | Present | Select any meeting; calendar remains visible while context changes | Matched |
| Select meeting for context | Same selected occurrence across all views | Shared selected EventId and contextual panel work in Year, Month, and Week | Select in Year, Month, Week; same stable EventId remains selected | Matched |
| Drag meeting | Native Move meeting flow with live validation | Same-panel Move flow updates the canonical occurrence immediately | Move to valid date/time; all views update immediately | Adapted |
| Add one-time event | Add meeting without fake source rule | Manual events use `SourceType=Manual` and no RuleId | Add manual event; SourceType=Manual; visible in all views | Matched |
| Remove meeting occurrence | Confirm, exclude generated occurrence, undo | Manual events remove locally; generated events create a local exclusion; Undo restores | Delete generated occurrence; regenerate; it remains excluded; undo restores | Adapted |
| Undo recent change | Restore previous state safely | Typed one-step snapshots cover add, move, delete/exclude, block, and closure deactivation | Move, delete, block, unblock; verify appropriate undo | Matched |
| Close/block day | Create plan-year hard stop with reason and impact preview | Block editor requires a reason, previews affected meetings, and proposes next valid dates | Block occupied day; affected meetings receive proposed alternatives | Matched |
| Remove user closure | Soft-deactivate for selected year with undo | User block can be removed; adjusted meetings are deliberately not moved back silently | Remove block; calendar marks rules changed; no silent meeting rollback | Matched |
| Verified holiday constraint | Visible hard stop; never host finalized meeting | One shared hard-stop function is used by add, move, and block/generation paths | Add/move/generate onto holiday; confirmation blocked or date proposed | Matched |
| Remove/deactivate holiday | Authorized plan-year deactivation with audit, not master deletion | “Mark open for [year]” requires a reason and soft-deactivates the year-specific occurrence | Deactivate holiday; reason/audit stored; regeneration recommended | Adapted |
| Automatic holiday adjustment | Next valid business date proposed and human-approved | Hard-stop collisions preserve original date, propose the next business date, and enter Needs approval | Generate holiday collision; original preserved; proposed date needs approval | Matched |
| Compact review queue | Vertically stacked queue, current item expanded, one scrollbar | Present for Board adjustments | Seed 3 adjustments; verify stacked navigation and automatic advance | Matched |
| Year/Month/Week | Three views over one plan state | Three physical screens project the same canonical collection and shared state | Switch views; preserve year, filters, selection, and pending edit | Matched |
| Crowded-day handling | Year shows limited chips plus `+N`; Month/Week expose detail | Year shows a primary chip plus count; Month and Week stack all four sample events | Seed 4 events on one day; verify overflow and full detail in Month/Week | Matched |
| Dynamic planning year | Generate 2026–2036 inclusively without cross-year overwrite | Year selector and date grids generate 2026–2036, including leap dates | Switch between 2026/2027/2036; verify isolated state and leap-year dates | Matched |
| Layered planning workflow | Board → Committees → Leadership → Operations → Final | Board only | Complete each layer; next unlocks; prior remains visible and protected | Deferred |
| Independent layer visibility | Board/Committee/Executive/Organization/Outlook filters do not change workflow | Board, Committees, Executive, and Operations visibility toggles filter the shared occurrence collection | Toggle Board-only while active step is Committees; workflow state unchanged | Matched |
| Confirm and lock layer | Block until rules/dates/decisions complete; then protect | Board confirmation exists | Try every blocked precondition, then confirm and verify protection | Partial |
| Reopen confirmed layer | Explicit warning and downstream stale/revalidation state | Missing | Reopen Board after Committees; Committees marked needs revalidation | Missing |
| Clear active layer | Clear only active draft, preserve confirmed and manual protected state | Missing | Clear Committees; Board/manual protected records remain | Missing |
| Full documented rule inventory | Every source group visible, including unresolved/unscheduled | Three Board rules only | Compare stable Rule IDs against canonical inventory; zero unexplained omissions | Missing |
| Human-readable rule summaries | Understand cadence without opening editor | Present for three Board rules | Review every catalog row for cadence/month/day/time/status summary | Partial |
| Simplified rule editor | Recurrence-driving fields first; admin details disclosed | Present for Board recurrence fields | Edit every cadence family; conditional controls and summary update correctly | Partial |
| Add meeting/rule group | New group begins unscheduled without invented cadence | Missing | Add group; no dates generated until rule becomes valid/confirmed | Missing |
| Deactivate/restore rule group | Remove from future generation without erasing history | Missing | Deactivate, regenerate, restore; audit and historical meetings preserved | Missing |
| Deterministic recurrence engine | One reusable engine for all layers and cadence families | Board generator contains local formulas | Run same rule engine across all layers and supported years | Partial |
| Regeneration impact preview | Explain moves, preserved overrides, exclusions before apply | Missing | Change rule affecting six records; preview counts exactly match result | Missing |
| Preserve manual overrides | Regeneration never erases approved moves | Partially present in Board generation | Move occurrence; regenerate; stable ID/current placement preserved | Partial |
| Preserve exclusions | Regeneration never recreates deleted generated occurrence | Generated deletion stores a stable local exclusion and Undo snapshot | Exclude occurrence; regenerate; it remains absent | Matched |
| Conflict explanations | Plain-language reason, severity, and proposed action | Holiday adjustment explanation exists | Seed hard stop and warning; verify distinct language and actions | Partial |
| Previous-year actual versus planned | Optional comparison retained or explicitly removed | Missing | Product decision and acceptance criteria documented | Product decision |
| Import calendar snapshot | Retain or replace explicitly with Outlook read context | Missing | Product decision and replacement test documented | Product decision |
| CSV/PDF/ICS exports | Retain useful exports or explicitly remove | Missing | Product decision and export content tests documented | Product decision |
| Planning Home / resume cue | Return to unfinished work with one primary action | Legacy `Screen1` exists but not current start | Resume seeded state and verify exact unfinished work is primary | Partial |
| SharePoint persistence | Storage invisible to user; resume exact state | Local collections only | Save, close, reopen; stable identities and decisions restored | Deferred |
| Outlook read-only context | Independent refresh, muted events, timestamp, graceful failure | Missing | Refresh success/failure; planning remains available; no Outlook mutation | Deferred |
| Outlook final review | Exact change preview and conflict gate | Missing | Compare plan/current Outlook with create/update/match/conflict counts | Deferred |
| Safe publish | Idempotent controlled publish; never auto-delete | Explicitly prohibited in current phase | Publish twice in controlled test; no duplicates; post-verify IDs | Deferred |
| Natural-language planning agent | Optional; deterministic engine remains authoritative | Not planned for Power Apps MVP | Product decision documented | Product decision |

## Ledger rules

- A capability moves to **Matched** only after its full user outcome passes in the actual Power Apps player.
- **Adapted** means the interaction differs but the user outcome is preserved.
- **Partial** is not complete and cannot satisfy a milestone gate.
- **Deferred** is allowed only when assigned to a named later milestone.
- A POC capability cannot disappear because the PRD omitted it; it must be implemented, explicitly removed, or recorded as a product decision.
