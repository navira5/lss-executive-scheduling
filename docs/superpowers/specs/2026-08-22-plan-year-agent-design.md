# Plan Year Agent Design

**Status:** Approved direction for the Wednesday 2027 planning prototype  
**Date:** 2026-08-22  
**Scope:** Annual calendar planning only; no Outlook write-back

## Outcome

Replace the existing global discovery queue with a phased **Plan Year** experience that mirrors how LSS builds its annual calendar. The user works through one scheduling layer at a time. The system pre-populates the active layer from the rulebook, an agent asks the next useful question, and the user can change meetings directly on the calendar or through natural-language requests.

The prototype must reduce cognitive load without inventing organizational authority. Historical patterns remain labeled as baselines, agent proposals remain proposals, and only explicit human confirmation completes a layer.

## Interaction Model

The annual calendar begins with verified federal holidays, projected LSS closures, blackout periods, and any imported Outlook snapshot events. It does not begin with every LSS meeting visible.

The first active phase is **Board & Governance**. The system generates the initial Full Board structure from the selected historical baseline and opens with a short agent message explaining what it placed and the first unresolved Board question. As the Board workflow advances, it adds retreats, critical-issue check-ins, Executive Committee, Finance Committee, other Board committees, and validated special Board events in rulebook order.

The user can:

- drag an active-layer meeting to another calendar date;
- open a meeting and edit its date, time, duration, location, title, message, attendees, or distribution lists;
- ask the agent for a change in natural language;
- edit the current meeting type's scheduling rule;
- regenerate the active layer from its current working rules;
- clear only the active layer;
- adopt an imported Outlook event into the plan;
- keep an imported event as an external commitment; or
- confirm the layer and continue.

Dragging, agent requests, and rule changes create a visible proposal. The app explains the impact and validates the change before the user applies it. No interaction silently changes a confirmed layer.

## Plan Year Phases

### 0. Calendar Constraints

Loaded automatically before meeting planning:

- verified 2027 federal holidays;
- projected LSS closures, visibly distinguished from verified holidays;
- Christmas-through-New-Year blackout;
- imported Outlook snapshot events; and
- manually added blackout or workload periods.

### 1. Board & Governance

Agent sequence:

1. Full Board meetings
2. Board retreats
3. Board Critical Issue Check-ins
4. Executive Committee
5. Administration & Finance Committee
6. Other Board committees
7. Board orientation and special events when validated
8. Board dependency check

Only the current and completed Board sublayers appear. The user remains in one Board-planning mindset and confirms the complete Board & Governance layer after all required sublayers have been reviewed.

### 2. Executive Leadership

Agent sequence:

1. Executive Team meetings
2. Executive Team retreats
3. Leadership Team meetings
4. Leadership Team retreats
5. Supervisory Team meetings

Confirmed Board anchors remain visible but locked.

### 3. Organization & Operations

Agent sequence:

1. All Staff
2. Quarterly Program Briefings
3. Operations meetings
4. BVR meetings
5. Internal Risk meetings
6. Other validated organizational meetings

Confirmed Board and Executive layers remain visible but locked.

### 4. Final Review

The engine checks dependencies, holidays, blackouts, workload, attendance, duplicate meetings, imported Outlook conflicts, and meeting density. The user resolves or explicitly accepts every blocking item before marking the local plan complete and exporting it.

## Agent Architecture

The agent is a context-aware language interpreter over a deterministic calendar system. It does not directly mutate calendar state.

The browser sends the agent only:

- the active phase and sublayer;
- the user's request;
- rules for the active meeting type;
- active-layer meetings;
- locked anchor meetings needed for conflict checks;
- relevant imported event metadata; and
- known holidays and hard constraints.

The server calls the OpenAI Responses API with a strict function schema. The model must return one of these structured proposals:

- move one or more meeting instances;
- change the time of matching instances;
- update a meeting instance;
- bulk-update meetings sharing an exact title;
- update a working rule;
- regenerate the active layer;
- clear the active layer;
- ask one clarification question; or
- explain that the request cannot be performed.

The browser validates the returned proposal with the deterministic engine. It then shows a concise preview of what will change. The user must select **Apply changes** before state changes.

When no API key is configured, the app must fail truthfully. A clearly labeled local demo interpreter may support the golden demonstration commands, but it must not claim to be the live AI agent.

## Natural-Language Context

The agent understands references relative to the current phase, including phrases such as:

- “Move all Board check-ins to 4:30 and keep them virtual.”
- “Put the May retreat on the third Tuesday.”
- “Make the Finance meetings two hours.”
- “Change the invitation message for all Full Board meetings.”
- “Keep this one meeting at the old title.”
- “Clear this layer and rebuild it from the rules.”

Ambiguous requests produce one clarifying question rather than an inferred change. A hard-stop violation produces an explanation and valid alternatives rather than an applied proposal.

## Rule and Meeting Editing

Rules are edited in the context of the current meeting type. The rule panel includes:

- meeting name and title template;
- purpose and invitation message template;
- owner;
- role-based attendee group;
- editable attendees and distribution lists;
- cadence and date-generation rule;
- preferred time and duration;
- modality and location;
- attendance requirement;
- flexibility classification;
- dependencies and preparation time;
- holiday and blackout handling;
- exception authority;
- source evidence; and
- rule authority status.

Working edits do not silently promote a rule from Baseline, Needs Validation, or Open Question to Confirmed. Human confirmation of a planning layer records a planning decision, not organizational approval of every source rule.

Meeting instances inherit the rule's title, message, attendees, time, duration, modality, and location. An instance becomes customized when any inherited value is changed directly.

Bulk updates use exact current meeting title as the selection key. Instances whose title was customized to a different value are excluded. The preview states how many meetings will change and identifies excluded custom instances.

## Outlook Snapshot Import

For Wednesday, Outlook is a file import rather than a live connection.

- Accept one or more labeled `.ics` files.
- Parse the file in the browser; do not upload the raw file to the application server.
- Expand recurring events that intersect 2027.
- Store parsed snapshot data only in browser-local state.
- Display at minimum meeting title, date, start time, end time, and calculated duration.
- Display location, organizer, attendees, recurrence, and description when present, but do not require them.
- Show imported events in a neutral **Existing Outlook** layer rather than an LSS meeting-category color.
- Preserve the original imported record when an event is adopted or overridden.
- Never move, delete, or update the source Outlook calendar.

Only metadata relevant to a user's agent request may be sent to the language model. The raw `.ics` file and full meeting body are never sent. For the Wednesday demonstration, use Navira's test calendar unless LSS explicitly approves using organizational calendar metadata with the model.

## State and Safety Boundaries

The prototype stores its plan in versioned browser-local state. It keeps these concepts separate:

- source rule authority;
- working rule edits;
- agent proposals;
- applied local plan changes;
- imported Outlook records; and
- confirmed planning layers.

Earlier confirmed layers are locked while later layers are being planned. Reopening a confirmed layer is explicit and warns that later layers may require revalidation.

Federal holidays are hard stops. Projected LSS closures remain provisional constraints. The engine must preserve an audit record when a recurrence is moved from its generated date.

## Interface

The primary screen has four regions:

1. **Phase rail** — progress through Board, Executive, Organization, and Final Review.
2. **Year-at-a-glance calendar** — the existing clean 3 × 4 view, showing active, locked, imported, holiday, and provisional states.
3. **Agent workspace** — one short question or response, a natural-language input, and a proposed-change preview.
4. **Context panel** — tabs for the active meeting's details, rules, and attendees.

The meeting-category colors remain stable:

- Board: navy
- Committee: blue
- Executive: teal
- Organization: purple
- Existing Outlook: neutral gray

Orange remains a secondary needs-input marker, red marks a blocked conflict, and green marks a reviewed or confirmed result.

## Error Handling

- Missing API key: show “Live agent not configured” and expose only the labeled demo interpreter.
- Agent timeout or invalid response: retain the user's message, explain that no change was applied, and allow retry.
- Invalid drag or requested date: retain the meeting at its original date and show the violated rule plus alternatives.
- Invalid `.ics` file: show an import summary with skipped records and reasons; do not partially hide failures.
- Duplicate imported event: preserve both records until the user chooses whether they represent the same meeting.
- Reopening a layer: identify downstream layers that become stale and require review.

## Verification

The build must prove:

1. The initial calendar shows constraints and Board meetings, not every 2027 meeting.
2. Confirming Board unlocks Executive; confirming Executive unlocks Organization.
3. Clearing or regenerating affects only the active layer.
4. Confirmed earlier layers cannot be changed without reopening them.
5. Dragging to a federal holiday is rejected.
6. Natural-language output cannot bypass deterministic validation.
7. Bulk title/message updates exclude instances with a different customized title.
8. Outlook import preserves title, date, time, and duration and expands 2027 recurrences.
9. Raw `.ics` contents and meeting bodies are not included in agent requests.
10. The app works without Outlook credentials and never writes to Outlook.

## Wednesday Boundary

Required for the working demonstration:

- phased Plan Year navigation;
- Board layer generated first from known rules;
- direct date adjustment with validation;
- contextual rules and meeting editing;
- layer confirmation and progressive reveal;
- natural-language proposal flow;
- `.ics` snapshot import with required event context;
- federal-holiday hard stops;
- browser-local persistence; and
- a complete Board-to-Organization walkthrough using the historical fixtures.

Not required for Wednesday:

- live Microsoft Graph connection;
- Outlook write-back;
- microphone input;
- multi-user collaboration;
- production authentication or database persistence;
- day-to-day Executive Scheduling Advisor; or
- autonomous calendar changes.
