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
  assert.match(html, /Board &amp; Governance/);
  assert.match(html, /Ask the planning agent/);
  assert.match(html, /Import Outlook snapshot/);
  assert.match(html, /Confirm Board &amp; Governance/);
  assert.match(html, /Full Board, retreats, and critical-issue check-ins/);
  assert.match(html, /event-chip board status-needs_decision/);
  assert.doesNotMatch(html, /event-chip decision/);
  assert.doesNotMatch(html, /Discovery session|Decision Queue/);
  assert.match(html, /Working plan/);
  assert.match(html, /No Outlook connection/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
