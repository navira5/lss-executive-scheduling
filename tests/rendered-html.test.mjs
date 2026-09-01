import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
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

test("the main URL leads to the three-option landing page", async () => {
  const response = await render();
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/scenarios");
});

test("server-renders the LSS Microsoft-connected annual planning workbench", async () => {
  const response = await render("/integrated");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>LSS 2027 Microsoft-Connected Calendar Planner<\/title>/i);
  assert.match(html, /Plan Year 2027/);
  assert.match(html, />Board</);
  assert.match(html, /Board Committees/);
  assert.match(html, /2(?:<!-- -->)? layers confirmed/);
  assert.match(html, /Meeting details/);
  assert.match(html, /Executive Leadership(?:<!-- -->)? layer/);
  assert.match(html, /Confirm (?:<!-- -->)?Executive Leadership/);
  assert.match(html, /Board Social/);
  assert.match(html, /Existing Outlook/);
  assert.match(html, /Martin Luther King Jr\. Day/);
  assert.match(html, /meeting-chip board regular confirmed/);
  assert.doesNotMatch(html, /Ask the planning agent|Plan Year scheduling agent/);
  assert.doesNotMatch(html, /Discovery session|Decision Queue/);
  assert.match(html, /Demo Outlook uploading is locked|Outlook changes require review and confirmation/);
  assert.match(html, /Private feedback workspace/);
  assert.match(html, /changes save only in this browser/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders a Microsoft-free standalone planner behind the same access gate", async () => {
  const response = await render("/standalone");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Standalone planner/);
  assert.match(html, /Import Calendar File/);
  assert.match(html, /Download Rules CSV/);
  assert.match(html, /Download Calendar \(\.ics\)/);
  assert.match(html, /no Microsoft connection/i);
  assert.match(html, /Imported calendar/);
  assert.doesNotMatch(html, /Load SharePoint Rules/);
  assert.doesNotMatch(html, /Sync Existing Outlook/);
  assert.doesNotMatch(html, /Review Outlook Changes/);
});

test("server-renders a concise comparison of all three delivery options", async () => {
  const response = await render("/scenarios");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /One planning workflow\. Three ways LSS could own it\./);
  assert.match(html, /Standalone planner/);
  assert.match(html, /Microsoft-connected planner/);
  assert.match(html, /Power Apps \+ custom calendar/);
  assert.match(html, /Power Apps Component Framework \(PCF\)/);
  assert.match(html, /What LSS is signing up to own/);
  assert.match(html, /Ongoing LSS effort/);
  assert.match(html, /Who gets called/);
  assert.match(html, /Where coding agents help/);
  assert.match(html, /LSS IT \+ developer/);
  assert.match(html, /Navira provides the prototype/);
});

test("server-renders the hosted Power Apps and PCF comparison shell", async () => {
  const response = await render("/power-apps");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Option C comparison preview/);
  assert.match(html, /Power Apps \+ PCF/);
  assert.match(html, /power-apps-preview\/index\.html/);

  const preview = await readFile(
    new URL("../dist/client/power-apps-preview/index.html", import.meta.url),
    "utf8",
  );
  assert.match(preview, /Power Apps \+ PCF preview/);
  assert.match(preview, /href="styles\.css"/);
  assert.match(preview, /src="app\.js"/);
});
