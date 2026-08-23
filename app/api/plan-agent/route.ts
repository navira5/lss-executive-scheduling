const TOOL_NAME = "propose_plan_changes";

const proposalParameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      type: "string",
      enum: [
        "move",
        "bulk_update",
        "update_rule",
        "configure_board",
        "regenerate_layer",
        "clear_layer",
        "clarify",
        "cannot_complete",
      ],
    },
    eventIds: { type: "array", items: { type: "string" } },
    exactTitle: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    templateId: { type: ["string", "null"] },
    boardScenario: {
      type: ["string", "null"],
      enum: ["continuity", "recent_direction", null],
    },
    weekday: { type: ["number", "null"], minimum: 0, maximum: 6 },
    patch: {
      type: "object",
      additionalProperties: false,
      properties: {
        startTime: { type: ["string", "null"] },
        durationMinutes: { type: ["number", "null"] },
        title: { type: ["string", "null"] },
        message: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        modality: { type: ["string", "null"] },
      },
      required: [
        "startTime",
        "durationMinutes",
        "title",
        "message",
        "location",
        "modality",
      ],
    },
    question: { type: ["string", "null"] },
    explanation: { type: "string" },
  },
  required: [
    "kind",
    "eventIds",
    "exactTitle",
    "date",
    "templateId",
    "boardScenario",
    "weekday",
    "patch",
    "question",
    "explanation",
  ],
};

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function sanitizeContext(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const events = Array.isArray(source.events) ? source.events : [];
  const rules = Array.isArray(source.rules) ? source.rules : [];
  const holidays = Array.isArray(source.holidays) ? source.holidays : [];
  return {
    activePhase: typeof source.activePhase === "string" ? source.activePhase : "",
    activeStepId: typeof source.activeStepId === "string" ? source.activeStepId : "",
    activeStepLabel: typeof source.activeStepLabel === "string" ? source.activeStepLabel : "",
    question: typeof source.question === "string" ? source.question : "",
    boardScenario:
      source.boardScenario === "recent_direction" ? "recent_direction" : "continuity",
    rules: rules.map((item) => {
      const rule = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        templateId: typeof rule.templateId === "string" ? rule.templateId : "",
        name: typeof rule.name === "string" ? rule.name : "",
        cadence: typeof rule.cadence === "string" ? rule.cadence : "",
        flexibility: typeof rule.flexibility === "string" ? rule.flexibility : "",
        ruleStatus: typeof rule.ruleStatus === "string" ? rule.ruleStatus : "",
        owner: typeof rule.owner === "string" ? rule.owner : "",
        attendeeGroup: typeof rule.attendeeGroup === "string" ? rule.attendeeGroup : "",
      };
    }),
    events: events.map((item) => {
      const event = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        id: typeof event.id === "string" ? event.id : "",
        templateId: typeof event.templateId === "string" ? event.templateId : "",
        title: typeof event.title === "string" ? event.title : "",
        date: typeof event.date === "string" ? event.date : "",
        startTime: typeof event.startTime === "string" ? event.startTime : null,
        durationMinutes: typeof event.durationMinutes === "number" ? event.durationMinutes : 0,
        modality: typeof event.modality === "string" ? event.modality : "",
        location: typeof event.location === "string" ? event.location : "",
        locked: event.locked === true,
      };
    }),
    holidays: holidays.map((item) => {
      const holiday = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        date: typeof holiday.date === "string" ? holiday.date : "",
        name: typeof holiday.name === "string" ? holiday.name : "",
        status: typeof holiday.status === "string" ? holiday.status : "",
      };
    }),
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Live agent not configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON request" }, { status: 400 });
  }
  if (typeof body.request !== "string" || !body.request.trim()) {
    return Response.json({ error: "A planning request is required" }, { status: 400 });
  }
  const context = sanitizeContext(body.context);
  const modelResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "You are the LSS Plan Year scheduling interpreter. Use only the supplied active-layer context. Propose changes; never claim they were applied. Respect locked events and holidays. Ask one concise question when a request is ambiguous. Never invent attendees, rules, dates, or organizational approval.",
      input: JSON.stringify({ request: body.request.trim(), context }),
      tools: [
        {
          type: "function",
          name: TOOL_NAME,
          description:
            "Return one structured proposal for the user's current Plan Year scheduling request.",
          parameters: proposalParameters,
          strict: true,
        },
      ],
      tool_choice: { type: "function", name: TOOL_NAME },
      parallel_tool_calls: false,
    }),
  });
  if (!modelResponse.ok) {
    return Response.json(
      { error: "The live planning agent could not respond" },
      { status: 502 },
    );
  }
  const payload = await modelResponse.json() as {
    output?: { type?: string; name?: string; arguments?: string }[];
  };
  const call = payload.output?.find(
    (item) => item.type === "function_call" && item.name === TOOL_NAME,
  );
  if (!call?.arguments) {
    return Response.json(
      { error: "The live planning agent returned no proposal" },
      { status: 502 },
    );
  }
  try {
    const proposal = JSON.parse(call.arguments) as Record<string, unknown>;
    return Response.json({
      ...proposal,
      eventIds: strings(proposal.eventIds),
    });
  } catch {
    return Response.json(
      { error: "The live planning agent returned an invalid proposal" },
      { status: 502 },
    );
  }
}
