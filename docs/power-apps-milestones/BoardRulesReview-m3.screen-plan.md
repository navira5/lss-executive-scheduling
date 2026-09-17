# Rulebook screen plan

The screen opens scoped to `varPlannerActiveLayer`, while keeping all meeting types reachable by switching layers. Saving a rule updates `colMeetingRulebook`, marks the owning layer for regeneration, reopens it if necessary, and marks downstream layers `Needs revalidation`.
