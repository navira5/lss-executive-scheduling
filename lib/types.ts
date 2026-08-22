export type RuleStatus =
  | "confirmed"
  | "2026_baseline"
  | "needs_validation"
  | "open_question";

export type EventStatus =
  | "ready"
  | "needs_decision"
  | "blocked"
  | "reviewed"
  | "exception_approved";

export type ConflictSeverity = "warning" | "decision" | "blocked";

export type MeetingCategory =
  | "board"
  | "committee"
  | "executive"
  | "organization";

export type GenerationRule =
  | { type: "weekly"; weekday: number }
  | {
      type: "nth_weekday";
      months: number[];
      ordinal: number;
      weekday: number;
    }
  | {
      type: "two_day_nth_weekday";
      months: number[];
      ordinal: number;
      weekday: number;
    }
  | { type: "fixed_dates"; dates: string[] }
  | { type: "month_placeholder"; months: number[] };

export interface SourceReference {
  label: string;
  detail: string;
}

export interface MeetingTemplate {
  id: string;
  abbreviation: string;
  name: string;
  category: MeetingCategory;
  purpose: string;
  owner: string;
  attendeeGroup: string;
  cadence: string;
  durationMinutes: number;
  startTime: string | null;
  modality: string;
  location: string;
  attendanceRequirement: string;
  flexibility: "protected" | "conditional" | "flexible";
  ruleStatus: RuleStatus;
  generation: GenerationRule;
  priority: number;
  sourceReferences: SourceReference[];
  assumptionIds?: string[];
  validationNote?: string;
}

export interface HolidayConstraint {
  date: string;
  name: string;
  status: "verified_federal" | "projected_lss";
}

export interface Conflict {
  id: string;
  type:
    | "holiday"
    | "blackout"
    | "attendance"
    | "dependency"
    | "workload"
    | "source_rule"
    | "missing_rule"
    | "automatic_move";
  severity: ConflictSeverity;
  summary: string;
  detail: string;
}

export interface Alternative {
  date: string;
  startTime?: string | null;
  reason: string;
}

export interface ProposedEvent {
  id: string;
  templateId: string;
  abbreviation: string;
  name: string;
  category: MeetingCategory;
  date: string;
  originalDate: string;
  startTime: string | null;
  durationMinutes: number;
  purpose: string;
  owner: string;
  attendeeGroup: string;
  modality: string;
  location: string;
  attendanceRequirement: string;
  flexibility: "protected" | "conditional" | "flexible";
  ruleStatus: RuleStatus;
  status: EventStatus;
  conflicts: Conflict[];
  alternatives: Alternative[];
  explanation: string;
  sourceReferences: SourceReference[];
  assumptionIds: string[];
  isPlaceholder: boolean;
}

export interface ScenarioAssumption {
  id: string;
  title: string;
  value: string;
  rationale: string;
  authority: "poc_only";
}

export interface DecisionItem {
  id: string;
  title: string;
  severity: "decision" | "blocked";
  summary: string;
  question: string;
  source: string;
  relatedTemplateId?: string;
  relatedEventId?: string;
}

export interface ScenarioSettings {
  boardScenario: "continuity" | "recent_direction";
  allStaffPattern: "detailed_calendar" | "meeting_matrix";
}

export interface LocalDecision {
  eventId: string;
  action: "reviewed" | "use_alternative" | "approve_exception";
  selectedDate?: string;
  selectedStartTime?: string | null;
  rationale?: string;
  decidedAt: string;
}

export interface CalendarPlan {
  year: number;
  label: string;
  generatedAt: string;
  settings: ScenarioSettings;
  assumptions: ScenarioAssumption[];
  holidays: HolidayConstraint[];
  events: ProposedEvent[];
  decisions: DecisionItem[];
}
