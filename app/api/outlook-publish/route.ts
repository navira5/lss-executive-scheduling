import { graphEventBody, type OutlookPublishPayload } from "@/lib/outlook-sync";
import { requireDemoApiSession } from "@/app/demo-auth";

interface PublishedEvent {
  id?: string;
  webLink?: string;
}

const DEFAULT_TIME_ZONE = "Eastern Standard Time";
const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function config() {
  const tenantId = env("MICROSOFT_TENANT_ID") || env("MS_TENANT_ID");
  const clientId = env("MICROSOFT_CLIENT_ID") || env("MS_CLIENT_ID");
  const clientSecret = env("MICROSOFT_CLIENT_SECRET") || env("MS_CLIENT_SECRET");
  const targetUser = env("OUTLOOK_TARGET_USER") || env("MICROSOFT_OUTLOOK_USER");
  return {
    tenantId,
    clientId,
    clientSecret,
    targetUser,
    calendarId: env("OUTLOOK_CALENDAR_ID"),
    timeZone: env("OUTLOOK_TIME_ZONE") || DEFAULT_TIME_ZONE,
    publishEnabled: env("OUTLOOK_PUBLISH_ENABLED").toLowerCase() === "true",
  };
}

function missing(settings: ReturnType<typeof config>): string[] {
  return [
    !settings.tenantId ? "MICROSOFT_TENANT_ID" : "",
    !settings.clientId ? "MICROSOFT_CLIENT_ID" : "",
    !settings.clientSecret ? "MICROSOFT_CLIENT_SECRET" : "",
    !settings.targetUser ? "OUTLOOK_TARGET_USER" : "",
  ].filter(Boolean);
}

async function accessToken(settings: ReturnType<typeof config>): Promise<string> {
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const response = await fetch(`https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Microsoft identity token request failed with ${response.status}.`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Microsoft identity token response did not include an access token.");
  return payload.access_token;
}

function publishPath(settings: ReturnType<typeof config>): string {
  const user = encodeURIComponent(settings.targetUser);
  const calendarPart = settings.calendarId
    ? `/calendars/${encodeURIComponent(settings.calendarId)}`
    : "/calendar";
  return `/users/${user}${calendarPart}/events`;
}

async function graphPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(`${GRAPH_ROOT}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Microsoft Graph event create failed with ${response.status}${detail ? `: ${detail.slice(0, 220)}` : ""}`);
  }
  return response.json() as Promise<T>;
}

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireDemoApiSession();
  if (unauthorized) return unauthorized;
  const settings = config();
  const missingFields = missing(settings);
  if (missingFields.length) {
    return Response.json({
      error: "Outlook integration is not configured.",
      missing: missingFields,
    }, { status: 503 });
  }

  let payload: OutlookPublishPayload;
  try {
    payload = await request.json() as OutlookPublishPayload;
  } catch {
    return Response.json({ error: "Expected a JSON publish payload." }, { status: 400 });
  }
  if (payload.confirm !== true) {
    return Response.json({ error: "Publishing to Outlook requires explicit confirmation." }, { status: 400 });
  }
  if (!settings.publishEnabled) {
    return Response.json({
      error: "Outlook publishing is disabled. Set OUTLOOK_PUBLISH_ENABLED=true only for an approved test mailbox.",
    }, { status: 403 });
  }
  const events = (payload.events ?? []).filter((event) => event.id && event.title && event.date);
  if (!events.length) {
    return Response.json({ error: "No confirmed planner events were supplied." }, { status: 400 });
  }

  try {
    const token = await accessToken(settings);
    const path = publishPath(settings);
    const published: { plannerEventId: string; outlookEventId?: string; webLink?: string }[] = [];
    const failed: { plannerEventId: string; error: string }[] = [];
    for (const event of events) {
      try {
        const result = await graphPost<PublishedEvent>(
          path,
          token,
          graphEventBody(event, settings.timeZone),
        );
        published.push({
          plannerEventId: event.id,
          outlookEventId: result.id,
          webLink: result.webLink,
        });
      } catch (error) {
        failed.push({
          plannerEventId: event.id,
          error: error instanceof Error ? error.message : "Unknown Outlook publish error.",
        });
      }
    }
    return Response.json({
      source: "outlook",
      targetUser: settings.targetUser,
      timeZone: settings.timeZone,
      published,
      failed,
      count: published.length,
    }, { status: failed.length ? 207 : 200 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Outlook calendar publish failed.",
    }, { status: 502 });
  }
}
