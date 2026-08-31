import {
  addAdHocEvent,
  addCalendarClosure,
  approveTemplateForPlan,
  confirmActivePhase,
  updateTemplateSchedule,
  updateWorkingRule,
  type PlanYearState,
} from "@/lib/plan-year";

export const PLANNING_SESSION_LABEL = "August 26, 2026 planning session";

const SESSION_DATES: Record<string, { dates: string[]; cadence: string }> = {
  "full-board": {
    dates: ["2027-04-13", "2027-06-08", "2027-10-12", "2027-12-14"],
    cadence: "Four regular meetings confirmed for 2027",
  },
  "board-retreat": {
    dates: ["2027-02-09", "2027-08-26"],
    cadence: "Two retreats confirmed for 2027",
  },
  "critical-checkin": {
    dates: ["2027-01-12", "2027-03-08", "2027-05-11", "2027-07-13", "2027-09-14", "2027-11-09"],
    cadence: "Six Board touchpoints confirmed for 2027",
  },
  "executive-committee": {
    dates: ["2027-01-19", "2027-03-02", "2027-05-04", "2027-07-06", "2027-09-07", "2027-11-02"],
    cadence: "Every other month; 2027 dates confirmed",
  },
  "health-programs": {
    dates: ["2027-03-16", "2027-06-15", "2027-09-21", "2027-12-07"],
    cadence: "Quarterly; 2027 dates confirmed",
  },
  "talent-risk": {
    dates: ["2027-02-16", "2027-05-18", "2027-08-17", "2027-11-16"],
    cadence: "Quarterly; 2027 dates confirmed",
  },
};

const ONE_OFF_BOARD_EVENTS = [
  { date: "2027-03-08", title: "Board Volunteer Opportunity (food pantry)", durationMinutes: 60 },
  { date: "2027-04-09", title: "New Board Member Orientation", durationMinutes: 90 },
  { date: "2027-05-11", title: "Board Social", durationMinutes: 60 },
  { date: "2027-10-08", title: "New Board Member Orientation Day", durationMinutes: 90 },
  { date: "2027-11-09", title: "Board Volunteer Faith Mission", durationMinutes: 60 },
];

function applyTemplateDates(
  state: PlanYearState,
  templateId: string,
  dates: string[],
  cadence: string,
): PlanYearState {
  let next = updateTemplateSchedule(state, templateId, {
    cadencePreset: "custom",
    annualCount: dates.length,
    startMonth: Number(dates[0].slice(5, 7)),
  });
  const events = next.plan.events
    .filter((event) => event.templateId === templateId && !event.isPlaceholder)
    .sort((left, right) => left.date.localeCompare(right.date));
  if (events.length !== dates.length) {
    throw new Error(`${PLANNING_SESSION_LABEL} could not map ${templateId}.`);
  }
  const eventOverrides = { ...next.eventOverrides };
  events.forEach((event, index) => {
    eventOverrides[event.id] = {
      ...eventOverrides[event.id],
      date: dates[index],
    };
  });
  next = { ...next, eventOverrides };
  return updateWorkingRule(next, templateId, {
    cadencePreset: "custom",
    annualCount: dates.length,
    cadence,
  });
}

function addSessionBoardEvent(
  state: PlanYearState,
  input: (typeof ONE_OFF_BOARD_EVENTS)[number],
): PlanYearState {
  const added = addAdHocEvent(state, input.date, input.title, "board");
  return {
    ...added.state,
    eventOverrides: {
      ...added.state.eventOverrides,
      [added.eventId]: {
        ...added.state.eventOverrides[added.eventId],
        durationMinutes: input.durationMinutes,
      },
    },
  };
}

export function apply2027PlanningSession(state: PlanYearState): PlanYearState {
  let next = state;
  for (const templateId of ["full-board", "board-retreat", "critical-checkin"]) {
    const session = SESSION_DATES[templateId];
    next = applyTemplateDates(next, templateId, session.dates, session.cadence);
  }
  for (const event of ONE_OFF_BOARD_EVENTS) {
    next = addSessionBoardEvent(next, event);
  }
  next = addCalendarClosure(next, "2027-12-23", "Xmas");
  for (const templateId of ["full-board", "board-retreat", "critical-checkin"]) {
    next = approveTemplateForPlan(next, templateId);
  }
  next = confirmActivePhase(next);

  for (const templateId of ["executive-committee", "health-programs", "talent-risk"]) {
    const session = SESSION_DATES[templateId];
    next = applyTemplateDates(next, templateId, session.dates, session.cadence);
    next = approveTemplateForPlan(next, templateId);
  }
  next = confirmActivePhase(next);

  return next;
}
