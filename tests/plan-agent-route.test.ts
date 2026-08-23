import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/plan-agent/route";

const requestBody = {
  request: "Move all Board check-ins to 4:30 and keep them virtual",
  context: {
    activePhase: "board",
    activeStepId: "board-calendar",
    activeStepLabel: "Board calendar",
    question: "Should 2027 keep the 2026 rhythm?",
    rules: [],
    events: [],
    holidays: [],
  },
};

test("fails truthfully when the live agent key is not configured", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const response = await POST(
      new Request("http://localhost/api/plan-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      }),
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "Live agent not configured",
    });
  } finally {
    if (previous) process.env.OPENAI_API_KEY = previous;
  }
});

test("returns only the structured plan proposal from the model response", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (_input, init) => {
    const authorization = new Headers(init?.headers).get("authorization");
    assert.equal(authorization, "Bearer test-key");
    return new Response(
      JSON.stringify({
        output: [
          {
            type: "function_call",
            name: "propose_plan_changes",
            arguments: JSON.stringify({
              kind: "clarify",
              eventIds: [],
              exactTitle: null,
              date: null,
              templateId: null,
              patch: {
                startTime: null,
                durationMinutes: null,
                title: null,
                message: null,
                location: null,
                modality: null,
              },
              question: "Which check-ins should change?",
              explanation: "The request is ambiguous.",
            }),
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  try {
    const response = await POST(
      new Request("http://localhost/api/plan-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      kind: "clarify",
      eventIds: [],
      exactTitle: null,
      date: null,
      templateId: null,
      patch: {
        startTime: null,
        durationMinutes: null,
        title: null,
        message: null,
        location: null,
        modality: null,
      },
      question: "Which check-ins should change?",
      explanation: "The request is ambiguous.",
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
