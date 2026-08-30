import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface DemoSession {
  username: string;
  expiresAt: number;
}

const COOKIE_NAME = "__Host-lss_demo_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function demoAuthEnabled(): boolean {
  return env("DEMO_AUTH_ENABLED").toLowerCase() === "true";
}

function config() {
  return {
    username: env("DEMO_USERNAME"),
    accessCode: env("DEMO_ACCESS_CODE"),
    sessionSecret: env("DEMO_SESSION_SECRET"),
  };
}

function assertConfigured() {
  const settings = config();
  if (!settings.username || !settings.accessCode || !settings.sessionSecret) {
    throw new Error("Temporary demo access is enabled but not fully configured.");
  }
  return settings;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function equalText(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  return equalBytes(leftDigest, rightDigest);
}

async function signature(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

export async function verifyDemoCredentials(username: string, accessCode: string): Promise<boolean> {
  if (!demoAuthEnabled()) return true;
  const settings = assertConfigured();
  const [usernameMatches, accessCodeMatches] = await Promise.all([
    equalText(username.trim().toLowerCase(), settings.username.toLowerCase()),
    equalText(accessCode, settings.accessCode),
  ]);
  return usernameMatches && accessCodeMatches;
}

export async function createDemoSessionToken(username: string): Promise<string> {
  const settings = assertConfigured();
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({
    username: username.trim(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  } satisfies DemoSession)));
  const signed = await signature(payload, settings.sessionSecret);
  return `${payload}.${base64UrlEncode(signed)}`;
}

export async function verifyDemoSessionToken(token: string): Promise<DemoSession | null> {
  if (!demoAuthEnabled()) {
    return { username: "Local demo", expiresAt: Date.now() + SESSION_DURATION_MS };
  }
  const settings = assertConfigured();
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const suppliedBytes = base64UrlDecode(suppliedSignature);
  if (!suppliedBytes) return null;
  const expectedBytes = await signature(payload, settings.sessionSecret);
  if (!equalBytes(suppliedBytes, expectedBytes)) return null;
  const payloadBytes = base64UrlDecode(payload);
  if (!payloadBytes) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(payloadBytes)) as DemoSession;
    if (!session.username || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getDemoSession(): Promise<DemoSession | null> {
  if (!demoAuthEnabled()) {
    return { username: "Local demo", expiresAt: Date.now() + SESSION_DURATION_MS };
  }
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token ? verifyDemoSessionToken(token) : null;
}

export async function requireDemoSession(returnTo = "/"): Promise<DemoSession> {
  const session = await getDemoSession();
  if (session) return session;
  redirect(`/demo-login?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

export async function requireDemoApiSession(): Promise<Response | null> {
  const session = await getDemoSession();
  if (session) return null;
  return Response.json({ error: "Temporary demo login required." }, { status: 401 });
}

export function safeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    return url.origin === "https://app.local" ? `${url.pathname}${url.search}` : "/";
  } catch {
    return "/";
  }
}

export const demoSessionCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  },
};
