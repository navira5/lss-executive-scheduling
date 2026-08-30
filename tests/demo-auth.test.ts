import assert from "node:assert/strict";
import test from "node:test";

import {
  createDemoSessionToken,
  safeReturnTo,
  verifyDemoCredentials,
  verifyDemoSessionToken,
} from "@/app/demo-auth";

const ENV_NAMES = [
  "DEMO_AUTH_ENABLED",
  "DEMO_USERNAME",
  "DEMO_ACCESS_CODE",
  "DEMO_SESSION_SECRET",
] as const;

function withDemoEnv() {
  const previous = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));
  process.env.DEMO_AUTH_ENABLED = "true";
  process.env.DEMO_USERNAME = "lss-demo";
  process.env.DEMO_ACCESS_CODE = "correct-horse-battery-staple";
  process.env.DEMO_SESSION_SECRET = "a-long-random-session-signing-secret-for-tests";
  return () => {
    for (const name of ENV_NAMES) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

test("temporary demo credentials require both the expected username and access code", async () => {
  const restore = withDemoEnv();
  try {
    assert.equal(await verifyDemoCredentials("LSS-DEMO", "correct-horse-battery-staple"), true);
    assert.equal(await verifyDemoCredentials("lss-demo", "wrong"), false);
    assert.equal(await verifyDemoCredentials("someone-else", "correct-horse-battery-staple"), false);
  } finally {
    restore();
  }
});

test("temporary demo session tokens are signed and reject tampering", async () => {
  const restore = withDemoEnv();
  try {
    const token = await createDemoSessionToken("lss-demo");
    const session = await verifyDemoSessionToken(token);
    assert.equal(session?.username, "lss-demo");
    assert.ok((session?.expiresAt ?? 0) > Date.now());
    assert.equal(await verifyDemoSessionToken(`${token}changed`), null);
  } finally {
    restore();
  }
});

test("temporary login return paths stay on the hosted app", () => {
  assert.equal(safeReturnTo("/calendar?phase=board"), "/calendar?phase=board");
  assert.equal(safeReturnTo("https://example.com/steal"), "/");
  assert.equal(safeReturnTo("//example.com/steal"), "/");
});
