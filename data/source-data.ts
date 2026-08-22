import type {
  DecisionItem,
  HolidayConstraint,
  MeetingTemplate,
  ScenarioAssumption,
  ScenarioSettings,
} from "@/lib/types";

const RULEBOOK = "MVP 1 Calendar Planning and Executive Scheduling Rulebook";
const DETAILED = "2026 LSS Meetings Calendar — detailed meeting sheet";
const MATRIX = "Meeting Matrix — Strategy, Values and Operations";
const BOARD = "2026 Board Calendar";

const commonTimes = {
  morning: "09:00",
  midMorning: "10:00",
  board: "17:00",
} as const;

export const holidays2027: HolidayConstraint[] = [
  { date: "2027-01-01", name: "New Year's Day", status: "verified_federal" },
  {
    date: "2027-01-18",
    name: "Martin Luther King Jr. Day",
    status: "verified_federal",
  },
  {
    date: "2027-02-15",
    name: "Washington's Birthday",
    status: "verified_federal",
  },
  { date: "2027-03-26", name: "Good Friday", status: "projected_lss" },
  { date: "2027-05-31", name: "Memorial Day", status: "verified_federal" },
  {
    date: "2027-06-18",
    name: "Juneteenth — observed",
    status: "verified_federal",
  },
  {
    date: "2027-07-05",
    name: "Independence Day — observed",
    status: "verified_federal",
  },
  { date: "2027-09-06", name: "Labor Day", status: "verified_federal" },
  { date: "2027-10-11", name: "Columbus Day", status: "verified_federal" },
  { date: "2027-11-11", name: "Veterans Day", status: "verified_federal" },
  { date: "2027-11-25", name: "Thanksgiving Day", status: "verified_federal" },
  {
    date: "2027-11-26",
    name: "Day after Thanksgiving",
    status: "projected_lss",
  },
  {
    date: "2027-12-24",
    name: "Christmas Day — observed",
    status: "verified_federal",
  },
  {
    date: "2027-12-31",
    name: "New Year's Day 2028 — observed",
    status: "verified_federal",
  },
];

export function buildAssumptions(
  settings: ScenarioSettings,
): ScenarioAssumption[] {
  return [
    {
      id: "A-BOARD",
      title: "Board structure",
      value:
        settings.boardScenario === "continuity"
          ? "Continue the six-meeting 2026 Board rhythm for the POC"
          : "Use four regular meetings, two retreats, and six check-ins",
      rationale:
        settings.boardScenario === "continuity"
          ? "This is the most traceable projection while the 2027 cadence remains unapproved."
          : "This follows Rachel's recent direction; May and November retreat months remain scenario assumptions.",
      authority: "poc_only",
    },
    {
      id: "A-HOLIDAYS",
      title: "Holiday and closure set",
      value: "2027 federal dates plus LSS closures projected from 2026",
      rationale:
        "The official LSS 2027 holiday and closure list has not yet been supplied.",
      authority: "poc_only",
    },
    {
      id: "A-PRECEDENCE",
      title: "Source precedence",
      value: "Detailed calendar sheet overrides the Meeting Matrix",
      rationale:
        "This follows the rulebook's source order for the POC and preserves conflicting evidence in the Decision Queue.",
      authority: "poc_only",
    },
    {
      id: "A-TIMES",
      title: "Missing start times",
      value: "Use visible demo times where the source specifies only cadence",
      rationale:
        "Dates are the focus of this POC; assumed times are labeled and are not approved scheduling rules.",
      authority: "poc_only",
    },
    {
      id: "A-AVAILABILITY",
      title: "Availability",
      value: "No live PTO or Outlook availability is applied",
      rationale:
        "The POC uses historical and scenario data only. Required-attendee checks are limited to conflicts inside this draft.",
      authority: "poc_only",
    },
  ];
}

function boardTemplates(settings: ScenarioSettings): MeetingTemplate[] {
  const regularMonths =
    settings.boardScenario === "continuity" ? [1, 3, 7, 9, 11] : [1, 3, 7, 9];
  const retreatMonths = settings.boardScenario === "continuity" ? [5] : [5, 11];

  return [
    {
      id: "full-board",
      abbreviation: "BOARD",
      name: "Full Board Meeting",
      category: "board",
      purpose: "Provide recurring governance discussion and decisions.",
      owner: "Board Chair / CEO",
      attendeeGroup: "Full Board",
      cadence: "Second Tuesday in selected months",
      durationMinutes: 120,
      startTime: commonTimes.board,
      modality: "In person",
      location: "LSS — location to confirm",
      attendanceRequirement: "Core attendance required",
      flexibility: "protected",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: regularMonths,
        ordinal: 2,
        weekday: 2,
      },
      priority: 100,
      sourceReferences: [
        {
          label: BOARD,
          detail: "2026 used six monthly Board touchpoints alternating with check-ins.",
        },
        {
          label: `${RULEBOOK} C.1`,
          detail: "The final 2027 Board skeleton must be confirmed.",
        },
      ],
      assumptionIds: ["A-BOARD"],
    },
    {
      id: "board-retreat",
      abbreviation: "B-RET",
      name: "Board Retreat",
      category: "board",
      purpose: "Long-form Board governance and strategic work.",
      owner: "Board Chair / CEO",
      attendeeGroup: "Full Board",
      cadence: "Scenario months; second Tuesday",
      durationMinutes:
        settings.boardScenario === "recent_direction" ? 300 : 120,
      startTime:
        settings.boardScenario === "recent_direction"
          ? "08:00"
          : commonTimes.board,
      modality: "In person",
      location: "LSS — location to confirm",
      attendanceRequirement: "Full attendance required",
      flexibility: "protected",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: retreatMonths,
        ordinal: 2,
        weekday: 2,
      },
      priority: 100,
      sourceReferences: [
        {
          label: BOARD,
          detail: "May 2026 was converted into a retreat.",
        },
        {
          label: `${RULEBOOK} C.1`,
          detail: "Recent direction suggests two longer retreats in 2027.",
        },
      ],
      assumptionIds: ["A-BOARD"],
    },
    {
      id: "critical-checkin",
      abbreviation: "BCI",
      name: "Board Critical Issue Check-in",
      category: "board",
      purpose: "Maintain a monthly Board touchpoint for critical issues.",
      owner: "Board Chair / CEO",
      attendeeGroup: "Full Board",
      cadence: "Second Tuesday in alternating months",
      durationMinutes: 30,
      startTime: commonTimes.board,
      modality: "Virtual",
      location: "Microsoft Teams",
      attendanceRequirement: "Core attendance required",
      flexibility: "protected",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: [2, 4, 6, 8, 10, 12],
        ordinal: 2,
        weekday: 2,
      },
      priority: 95,
      sourceReferences: [
        {
          label: BOARD,
          detail: "2026 alternated six short virtual check-ins with Full Board meetings.",
        },
        {
          label: `${RULEBOOK} C.1`,
          detail: "Six 2027 check-ins were discussed but not approved.",
        },
      ],
      assumptionIds: ["A-BOARD"],
    },
  ];
}

export function buildMeetingTemplates(
  settings: ScenarioSettings,
): MeetingTemplate[] {
  const allStaffMonths =
    settings.allStaffPattern === "detailed_calendar"
      ? [1, 4, 7, 10]
      : [2, 5, 8, 11];
  const allStaffDuration =
    settings.allStaffPattern === "detailed_calendar" ? 60 : 45;

  const templates: MeetingTemplate[] = [
    ...boardTemplates(settings),
    {
      id: "executive-committee",
      abbreviation: "EXEC-C",
      name: "Executive Committee",
      category: "committee",
      purpose: "Provide an authoritative governance body between Board meetings.",
      owner: "Board Chair",
      attendeeGroup: "Executive Committee",
      cadence: "Every other month; fourth Tuesday",
      durationMinutes: 90,
      startTime: commonTimes.board,
      modality: "To confirm",
      location: "To confirm",
      attendanceRequirement: "Core attendance required",
      flexibility: "protected",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: [2, 4, 6, 8, 10, 12],
        ordinal: 4,
        weekday: 2,
      },
      priority: 90,
      sourceReferences: [
        {
          label: BOARD,
          detail: "2026 used the fourth Tuesday in alternating months, with a December exception.",
        },
        {
          label: `${RULEBOOK} C.2`,
          detail: "2027 cadence, default day, and holiday-month handling need validation.",
        },
      ],
    },
    {
      id: "finance-committee",
      abbreviation: "A&F",
      name: "Administration & Finance Committee",
      category: "committee",
      purpose: "Review financial matters before required Board action.",
      owner: "Administration & Finance Committee Chair",
      attendeeGroup: "Administration & Finance Committee",
      cadence: "Every other month; normally fourth Tuesday",
      durationMinutes: 90,
      startTime: commonTimes.board,
      modality: "To confirm",
      location: "To confirm",
      attendanceRequirement: "Core attendance required",
      flexibility: "conditional",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: [1, 3, 5, 7, 9, 11],
        ordinal: 4,
        weekday: 2,
      },
      priority: 88,
      sourceReferences: [
        {
          label: BOARD,
          detail: "2026 used January, March, May, July, September, and November.",
        },
        {
          label: `${RULEBOOK} C.3`,
          detail: "Financial-data timing and Board decision deadlines outrank normal cadence.",
        },
      ],
      validationNote:
        "The 2027 budget deadline, exact data-ready date, and which items require Board action are missing.",
    },
    {
      id: "health-programs",
      abbreviation: "H&P",
      name: "Health Center & Programs Committee",
      category: "committee",
      purpose: "Purpose and required outputs need confirmation.",
      owner: "Committee Chair",
      attendeeGroup: "Health Center & Programs Committee",
      cadence: "Third Tuesday of the third month of each quarter",
      durationMinutes: 90,
      startTime: commonTimes.board,
      modality: "To confirm",
      location: "To confirm",
      attendanceRequirement: "To confirm",
      flexibility: "conditional",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: [3, 6, 9, 12],
        ordinal: 3,
        weekday: 2,
      },
      priority: 80,
      sourceReferences: [
        {
          label: BOARD,
          detail: "2026 followed the third-Tuesday quarterly pattern.",
        },
        {
          label: `${RULEBOOK} C.4`,
          detail: "Name, purpose, outputs, attendees, and Board dependencies need validation.",
        },
      ],
    },
    {
      id: "talent-risk",
      abbreviation: "T&R",
      name: "Talent & Risk Management Committee",
      category: "committee",
      purpose: "Review talent and risk matters; current purpose needs confirmation.",
      owner: "Committee Chair",
      attendeeGroup: "Talent & Risk Management Committee",
      cadence: "First Tuesday of the second month of each quarter",
      durationMinutes: 90,
      startTime: commonTimes.board,
      modality: "To confirm",
      location: "To confirm",
      attendanceRequirement: "To confirm",
      flexibility: "conditional",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: [2, 5, 8, 11],
        ordinal: 1,
        weekday: 2,
      },
      priority: 80,
      sourceReferences: [
        {
          label: BOARD,
          detail: "The May 2026 date was an exception; the August source contains a year typo.",
        },
        {
          label: `${RULEBOOK} C.5`,
          detail: "Purpose, structure, outputs, and 2027 cadence require validation.",
        },
      ],
    },
    {
      id: "board-orientation",
      abbreviation: "ORIENT",
      name: "Board Orientation Window",
      category: "board",
      purpose: "Prepare new Board members for service.",
      owner: "Board / Executive Administration",
      attendeeGroup: "New Board Members",
      cadence: "April and October window",
      durationMinutes: 90,
      startTime: commonTimes.midMorning,
      modality: "To confirm",
      location: "To confirm",
      attendanceRequirement: "Informational",
      flexibility: "flexible",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: [4, 10],
        ordinal: 2,
        weekday: 5,
      },
      priority: 55,
      sourceReferences: [
        {
          label: BOARD,
          detail: "2026 held orientation windows on the second Friday in April and October.",
        },
        {
          label: `${RULEBOOK} C.7`,
          detail: "Confirm whether standing windows are needed in 2027.",
        },
      ],
    },
    {
      id: "executive-team",
      abbreviation: "ET",
      name: "Executive Team Meeting",
      category: "executive",
      purpose: "Define and manage LSS strategy and make organization-wide decisions.",
      owner: "CEO",
      attendeeGroup: "Executive Team",
      cadence: "Weekly Monday",
      durationMinutes: 90,
      startTime: commonTimes.morning,
      modality: "To confirm",
      location: "To confirm",
      attendanceRequirement: "Core attendance required",
      flexibility: "conditional",
      ruleStatus: "confirmed",
      generation: { type: "weekly", weekday: 1 },
      priority: 70,
      sourceReferences: [
        { label: MATRIX, detail: "Weekly L-10 meeting lasting 1.5 hours." },
        {
          label: `${RULEBOOK} D.1`,
          detail: "Monday is the normal day; holiday occurrences require an alternative.",
        },
      ],
      assumptionIds: ["A-TIMES"],
    },
    {
      id: "executive-retreat",
      abbreviation: "ETR",
      name: "Executive Team Quarterly Retreat",
      category: "executive",
      purpose: "Review results and set quarterly priorities or Rocks.",
      owner: "CEO",
      attendeeGroup: "Executive Team",
      cadence: "Quarterly Friday near quarter boundary",
      durationMinutes: 240,
      startTime: commonTimes.morning,
      modality: "In person",
      location: "To confirm",
      attendanceRequirement: "Full attendance required",
      flexibility: "protected",
      ruleStatus: "needs_validation",
      generation: {
        type: "fixed_dates",
        dates: ["2027-03-26", "2027-06-25", "2027-09-24", "2027-12-17"],
      },
      priority: 78,
      sourceReferences: [
        {
          label: MATRIX,
          detail: "Quarterly, four hours, by the end of the first week of the quarter; June annual planning noted.",
        },
        {
          label: `${RULEBOOK} D.2`,
          detail: "Discovery described Fridays near quarter-end; the exact rule is unresolved.",
        },
      ],
    },
    {
      id: "leadership-team",
      abbreviation: "LTM",
      name: "Leadership Team Meeting",
      category: "organization",
      purpose: "Align program and functional leadership on strategy and priorities.",
      owner: "CEO",
      attendeeGroup: "Executive Team, Program Directors, Functional Leaders",
      cadence: "Monthly second Thursday",
      durationMinutes: 60,
      startTime: commonTimes.midMorning,
      modality: "Virtual",
      location: "Microsoft Teams",
      attendanceRequirement: "Core attendance required",
      flexibility: "conditional",
      ruleStatus: "2026_baseline",
      generation: {
        type: "nth_weekday",
        months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        ordinal: 2,
        weekday: 4,
      },
      priority: 65,
      sourceReferences: [
        {
          label: DETAILED,
          detail: "February–December follow the second Thursday; January 2026 was a Friday anomaly.",
        },
        { label: `${RULEBOOK} D.3`, detail: "January exception requires explanation." },
      ],
    },
    {
      id: "leadership-retreat",
      abbreviation: "LTR",
      name: "Leadership Team Retreat",
      category: "organization",
      purpose: "Fine-tune organizational strategy and priorities.",
      owner: "CEO / VPs",
      attendeeGroup: "Leadership Team",
      cadence: "Twice yearly",
      durationMinutes: 240,
      startTime: commonTimes.morning,
      modality: "In person",
      location: "To confirm",
      attendanceRequirement: "Full attendance required",
      flexibility: "protected",
      ruleStatus: "needs_validation",
      generation: {
        type: "fixed_dates",
        dates: ["2027-01-07", "2027-09-09"],
      },
      priority: 76,
      sourceReferences: [
        {
          label: DETAILED,
          detail: "2026 detail tab lists January 7 and September 10; the master grid lists September 11.",
        },
        {
          label: `${RULEBOOK} D.4`,
          detail: "The relationship to Executive Retreats and monthly Leadership meetings is unresolved.",
        },
      ],
      validationNote:
        "September's historical sources disagree, and the 2027 projection overlaps the monthly Leadership Team meeting.",
    },
    {
      id: "all-staff",
      abbreviation: "ASM",
      name: "All Staff Meeting",
      category: "organization",
      purpose: "Share organizational status and reinforce LSS mission and values.",
      owner: "Executive Team",
      attendeeGroup: "All LSS Staff",
      cadence:
        settings.allStaffPattern === "detailed_calendar"
          ? "Quarterly; third Wednesday"
          : "Matrix months; third Wednesday borrowed from detailed baseline",
      durationMinutes: allStaffDuration,
      startTime: commonTimes.midMorning,
      modality: "Virtual",
      location: "Microsoft Teams",
      attendanceRequirement: "Informational",
      flexibility: "conditional",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: allStaffMonths,
        ordinal: 3,
        weekday: 3,
      },
      priority: 60,
      sourceReferences: [
        {
          label: DETAILED,
          detail: "January/April/July/October, third Wednesday, one hour.",
        },
        {
          label: MATRIX,
          detail: "February/May/August/November, 45 minutes.",
        },
        {
          label: `${RULEBOOK} D.5`,
          detail: "Use detailed sheet as the POC baseline and validate the 2027 rule.",
        },
      ],
      assumptionIds: ["A-PRECEDENCE"],
      validationNote: "The two current sources disagree on both months and duration.",
    },
    {
      id: "program-briefing",
      abbreviation: "QPB",
      name: "Quarterly Program Briefing — date TBD",
      category: "organization",
      purpose: "Provide program updates and reinforce LSS mission and priorities.",
      owner: "Program Directors / Internal Communications",
      attendeeGroup: "Program Staff",
      cadence: "Second month of each quarter; owner selects date",
      durationMinutes: 60,
      startTime: null,
      modality: "To confirm",
      location: "To confirm",
      attendanceRequirement: "To confirm",
      flexibility: "flexible",
      ruleStatus: "open_question",
      generation: { type: "month_placeholder", months: [2, 5, 8, 11] },
      priority: 45,
      sourceReferences: [
        {
          label: DETAILED,
          detail: "February, May, August, and November; Program Directors select exact dates.",
        },
        {
          label: MATRIX,
          detail: "A different quarterly month pattern is listed and a results dependency is questioned.",
        },
        {
          label: `${RULEBOOK} D.6`,
          detail: "The agent may reserve the month but must not invent a final date.",
        },
      ],
    },
    {
      id: "supervisory-team",
      abbreviation: "STM",
      name: "Supervisory Team Meeting",
      category: "organization",
      purpose: "Cascade organizational information and initiatives to supervisors.",
      owner: "Executive Team",
      attendeeGroup: "LSS Supervisors",
      cadence: "Three times yearly; last Thursday",
      durationMinutes: 210,
      startTime: commonTimes.morning,
      modality: "In person",
      location: "To confirm",
      attendanceRequirement: "To confirm",
      flexibility: "conditional",
      ruleStatus: "needs_validation",
      generation: {
        type: "nth_weekday",
        months: [2, 5, 10],
        ordinal: -1,
        weekday: 4,
      },
      priority: 58,
      sourceReferences: [
        {
          label: DETAILED,
          detail: "February, May, and October; last Thursday; 3.5 hours in person.",
        },
        { label: MATRIX, detail: "Describes the meeting as quarterly without matching timing detail." },
        { label: `${RULEBOOK} D.7`, detail: "Frequency must be validated for 2027." },
      ],
    },
    {
      id: "operations",
      abbreviation: "OPS",
      name: "Operations Meeting",
      category: "organization",
      purpose: "Review financial results, service delivery, KPIs, and quality.",
      owner: "CEO",
      attendeeGroup: "Executive Team and Program Directors",
      cadence: "Third Wednesday and Thursday of quarter's third month",
      durationMinutes: 45,
      startTime: commonTimes.midMorning,
      modality: "In person",
      location: "To confirm",
      attendanceRequirement: "Core attendance required",
      flexibility: "conditional",
      ruleStatus: "needs_validation",
      generation: {
        type: "two_day_nth_weekday",
        months: [3, 6, 9, 12],
        ordinal: 3,
        weekday: 3,
      },
      priority: 62,
      sourceReferences: [
        {
          label: DETAILED,
          detail: "Two 45-minute in-person dates per quarter in March, June, September, and December.",
        },
        {
          label: MATRIX,
          detail: "Bi-monthly or quarterly, fourth Wednesday, 30 minutes — a conflicting pattern.",
        },
        { label: `${RULEBOOK} D.8`, detail: "Use detailed sheet for the POC and validate structure." },
      ],
      validationNote:
        "The reason for two dates, number of program sessions, and data dependencies are missing.",
    },
    {
      id: "bvr",
      abbreviation: "BVR",
      name: "BVR Meeting Slots — mapping needed",
      category: "organization",
      purpose: "Program-level financial deep dive.",
      owner: "To confirm",
      attendeeGroup: "Program and financial leaders — mapping required",
      cadence: "Monthly second Tuesday/Wednesday",
      durationMinutes: 30,
      startTime: null,
      modality: "Virtual",
      location: "Microsoft Teams",
      attendanceRequirement: "To confirm",
      flexibility: "conditional",
      ruleStatus: "open_question",
      generation: {
        type: "month_placeholder",
        months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      },
      priority: 35,
      sourceReferences: [
        {
          label: DETAILED,
          detail: "Monthly, second Tuesday/Wednesday, 30 minutes, virtual; master dates are inconsistent.",
        },
        {
          label: `${RULEBOOK} D.9`,
          detail: "Do not create the complete monthly set until the program-to-slot mapping is supplied.",
        },
      ],
    },
    {
      id: "internal-risk",
      abbreviation: "IR",
      name: "Internal Risk Committee",
      category: "committee",
      purpose: "Purpose and governance relationship are not documented.",
      owner: "To confirm",
      attendeeGroup: "To confirm",
      cadence: "Quarterly; third Thursday in first month",
      durationMinutes: 90,
      startTime: commonTimes.midMorning,
      modality: "In person",
      location: "To confirm",
      attendanceRequirement: "To confirm",
      flexibility: "conditional",
      ruleStatus: "open_question",
      generation: {
        type: "nth_weekday",
        months: [1, 4, 7, 10],
        ordinal: 3,
        weekday: 4,
      },
      priority: 48,
      sourceReferences: [
        {
          label: DETAILED,
          detail: "The tab states third Thursday, but January 22, 2026 was the fourth Thursday; October appears only in the detail tab.",
        },
        {
          label: `${RULEBOOK} D.10`,
          detail: "Purpose, owner, attendees, representation, and Board relationship are open.",
        },
      ],
    },
  ];

  return templates;
}

export function buildBaseDecisionItems(
  settings: ScenarioSettings,
): DecisionItem[] {
  return [
    {
      id: "D-BOARD",
      title: "Approve the 2027 Board structure",
      severity: "decision",
      summary:
        settings.boardScenario === "continuity"
          ? "The draft currently projects the 2026 Board rhythm."
          : "The draft uses the recent two-retreat direction with assumed retreat months.",
      question:
        "Should 2027 use four regular meetings plus two retreats, and which months should hold the retreats?",
      source: `${RULEBOOK} C.1 and H.1`,
      relatedTemplateId: "full-board",
    },
    {
      id: "D-HOLIDAYS",
      title: "Supply the official 2027 LSS holiday list",
      severity: "blocked",
      summary:
        "Federal dates are calculated, but Good Friday, the day after Thanksgiving, Christmas Eve, and the year-end closure are projected from 2026.",
      question: "Which 2027 dates are official LSS closures or no-meeting periods?",
      source: `${RULEBOOK} B.1 and H.1`,
    },
    {
      id: "D-FINANCE",
      title: "Confirm Finance-to-Board sequencing",
      severity: "blocked",
      summary:
        "The draft can place the recurring committee dates, but it cannot prove that every required Board decision follows completed financial review.",
      question:
        "What is the 2027 budget deadline, when are financials ready, and which items require Board action?",
      source: `${RULEBOOK} C.3 and H.1`,
      relatedTemplateId: "finance-committee",
    },
    {
      id: "D-ALL-STAFF",
      title: "Choose the All Staff pattern",
      severity: "decision",
      summary:
        settings.allStaffPattern === "detailed_calendar"
          ? "The draft uses January/April/July/October for one hour."
          : "The draft uses February/May/August/November for 45 minutes.",
      question: "Which month pattern and duration should govern 2027?",
      source: `${DETAILED}, ${MATRIX}, and ${RULEBOOK} D.5`,
      relatedTemplateId: "all-staff",
    },
    {
      id: "D-LTR",
      title: "Resolve Leadership Retreat timing and overlap",
      severity: "decision",
      summary:
        "Historical September sources disagree, and the projected September retreat collides with the monthly Leadership meeting.",
      question:
        "Which two 2027 months should be used, and does a retreat replace the monthly meeting?",
      source: `${RULEBOOK} D.4`,
      relatedTemplateId: "leadership-retreat",
    },
    {
      id: "D-QPB",
      title: "Provide Program Briefing date-selection rules",
      severity: "blocked",
      summary:
        "The months can be reserved, but the number of program-specific events and final dates are unknown.",
      question:
        "Is there one briefing or one per program, and how does each Program Director select a date?",
      source: `${RULEBOOK} D.6`,
      relatedTemplateId: "program-briefing",
    },
    {
      id: "D-BVR",
      title: "Map BVR programs to monthly slots",
      severity: "blocked",
      summary:
        "The source shows multiple sessions and inconsistent dates, but no program-to-slot map.",
      question: "What does BVR stand for, and which program owns each Tuesday or Wednesday slot?",
      source: `${RULEBOOK} D.9`,
      relatedTemplateId: "bvr",
    },
    {
      id: "D-IR",
      title: "Define Internal Risk",
      severity: "blocked",
      summary:
        "Purpose, owner, attendees, and governance dependency are missing; its observed January date also violates the stated recurrence.",
      question:
        "Who owns this committee, who must attend, and is the third-Thursday rule authoritative?",
      source: `${RULEBOOK} D.10`,
      relatedTemplateId: "internal-risk",
    },
    {
      id: "D-OPS",
      title: "Confirm the Operations meeting structure",
      severity: "decision",
      summary:
        "The detailed calendar and Meeting Matrix disagree on cadence, duration, month pattern, and weekday.",
      question: "Why are there two quarterly dates, and how many program sessions occur on each date?",
      source: `${RULEBOOK} D.8`,
      relatedTemplateId: "operations",
    },
    {
      id: "D-STM",
      title: "Confirm Supervisory Team frequency",
      severity: "decision",
      summary: "The detailed calendar schedules three meetings while the Matrix calls it quarterly.",
      question: "Should 2027 use three meetings or four?",
      source: `${RULEBOOK} D.7`,
      relatedTemplateId: "supervisory-team",
    },
  ];
}
