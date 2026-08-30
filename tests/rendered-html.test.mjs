import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the LSS annual planning workbench", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>LSS 2027 Calendar Planning Workbench<\/title>/i);
  assert.match(html, /Plan Year 2027/);
  assert.match(html, />Board</);
  assert.match(html, /Board Committees/);
  assert.match(html, /Meeting settings/);
  assert.match(html, /Existing Outlook snapshot/);
  assert.match(html, /Confirm (?:<!-- -->)?Board/);
  assert.match(html, /2026 actual/);
  assert.match(html, /2027 planned/);
  assert.match(html, /Shared attendees/);
  assert.match(html, /Annual count/);
  assert.match(html, /Cadence/);
  assert.match(html, /Every other month/);
  assert.match(html, /Starting month/);
  assert.match(html, /Week of month/);
  assert.match(html, /Martin Luther King Jr\. Day/);
  assert.match(html, /meeting-chip board regular unconfirmed/);
  assert.doesNotMatch(html, /Ask the planning agent|Plan Year scheduling agent/);
  assert.doesNotMatch(html, /Discovery session|Decision Queue/);
  assert.match(html, /Demo Outlook publishing is locked|Outlook writes require human confirmation/);
  assert.match(html, /Private feedback workspace/);
  assert.match(html, /changes save only in this browser/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
