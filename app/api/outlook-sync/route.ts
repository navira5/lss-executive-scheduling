import { requireDemoApiSession } from "@/app/demo-auth";
import {
  buildOutlookSyncPreview,
  graphEventBody,
  graphEventPatchBody,
  type OutlookEventFields,
  type OutlookSyncRequest,
} from "@/lib/outlook-sync";
import {
  microsoftGraphFailureLog,
  microsoftGraphFailureResponse,
  microsoftGraphRequestError,
} from "@/lib/microsoft-graph-error";

interface GraphCollection<T> {
  value?: T[];
  "@odata.nextLink"?: string;
}

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const DEFAULT_TIME_ZONE = "Eastern Standard Time";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function config() {
  return {
    tenantId: env("MICROSOFT_TENANT_ID") || env("MS_TENANT_ID"),
    clientId: env("MICROSOFT_CLIENT_ID") || env("MS_CLIENT_ID"),
    clientSecret: env("MICROSOFT_CLIENT_SECRET") || env("MS_CLIENT_SECRET"),
    targetUser: env("OUTLOOK_TARGET_USER") || env("MICROSOFT_OUTLOOK_USER"),
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
    !settings.calendarId ? "OUTLOOK_CALENDAR_ID" : "",
  ].filter(Boolean);
}

async function accessToken(settings: ReturnType<typeof config>): Promise<string> {
  const response = await fetch(`https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) throw new Error(`Microsoft identity token request failed with ${response.status}.`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Microsoft identity token response did not include an access token.");
  return payload.access_token;
}

function calendarBase(settings: ReturnType<typeof config>): string {
  return `/users/${encodeURIComponent(settings.targetUser)}/calendars/${encodeURIComponent(settings.calendarId)}`;
}

function calendarViewPath(settings: ReturnType<typeof config>): string {
  const params = new URLSearchParams({
    startDateTime: "2027-01-01T00:00:00",
    endDateTime: "2028-01-01T00:00:00",
    "$top": "100",
    "$select": "id,iCalUId,subject,isAllDay,start,end,location,organizer,attendees,body,bodyPreview,recurrence",
    "$orderby": "start/dateTime",
  });
  return `${calendarBase(settings)}/calendarView?${params.toString()}`;
}

async function graphCollection<T>(path: string, token: string, timeZone: string): Promise<T[]> {
  const rows: T[] = [];
  let next: string | undefined = `${GRAPH_ROOT}${path}`;
  while (next) {
    const response = await fetch(next, {
      headers: {
        authorization: `Bearer ${token}`,
        prefer: `outlook.timezone="${timeZone}", outlook.body-content-type="text"`,
      },
    });
    if (!response.ok) throw await microsoftGraphRequestError(response, "read");
    const page = await response.json() as GraphCollection<T>;
    rows.push(...(page.value ?? []));
    next = page["@odata.nextLink"];
  }
  return rows;
}

async function graphMutation(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  token: string,
  body?: unknown,
): Promise<{ id?: string; webLink?: string }> {
  const response = await fetch(`${GRAPH_ROOT}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw await microsoftGraphRequestError(response, "write");
  }
  if (response.status === 204) return {};
  return response.json() as Promise<{ id?: string; webLink?: string }>;
}

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireDemoApiSession();
  if (unauthorized) return unauthorized;
  const settings = config();
  const missingFields = missing(settings);
  if (missingFields.length) {
    return Response.json({ error: "Outlook integration is not configured for a dedicated calendar.", missing: missingFields }, { status: 503 });
  }

  let payload: OutlookSyncRequest;
  try {
    payload = await request.json() as OutlookSyncRequest;
  } catch {
    return Response.json({ error: "Expected a JSON Outlook sync request." }, { status: 400 });
  }

  try {
    const token = await accessToken(settings);
    const existing = await graphCollection<OutlookEventFields>(calendarViewPath(settings), token, settings.timeZone);
    const desired = (payload.events ?? []).filter((event) => event.id && event.title && event.date);
    const preview = buildOutlookSyncPreview(
      desired,
      existing,
      payload.cancelledPlannerEventIds ?? [],
      payload.deleteOutlookEventIds ?? [],
    );
    if (payload.confirm !== true) {
      return Response.json({ source: "outlook", targetUser: settings.targetUser, timeZone: settings.timeZone, preview });
    }
    if (!settings.publishEnabled) {
      return Response.json({ error: "Outlook publishing is disabled for this deployment." }, { status: 403 });
    }

    const desiredById = new Map(desired.map((event) => [event.id, event]));
    const applied: Array<{ action: string; title: string; outlookEventId?: string }> = [];
    const failed: Array<{ action: string; title: string; error: string }> = [];
    for (const change of preview.changes) {
      try {
        if (change.action === "create" && change.plannerEventId) {
          const event = desiredById.get(change.plannerEventId);
          if (!event) throw new Error("The planner event is no longer available.");
          const result = await graphMutation("POST", `${calendarBase(settings)}/events`, token, graphEventBody(event, settings.timeZone));
          applied.push({ action: change.action, title: change.title, outlookEventId: result.id });
        } else if (change.action === "update" && change.plannerEventId && change.outlookEventId) {
          const event = desiredById.get(change.plannerEventId);
          if (!event) throw new Error("The planner event is no longer available.");
          await graphMutation("PATCH", `${calendarBase(settings)}/events/${encodeURIComponent(change.outlookEventId)}`, token, graphEventPatchBody(event, settings.timeZone));
          applied.push({ action: change.action, title: change.title, outlookEventId: change.outlookEventId });
        } else if (change.action === "delete" && change.outlookEventId) {
          await graphMutation("DELETE", `${calendarBase(settings)}/events/${encodeURIComponent(change.outlookEventId)}`, token);
          applied.push({ action: change.action, title: change.title, outlookEventId: change.outlookEventId });
        }
      } catch (error) {
        failed.push({
          action: change.action,
          title: change.title,
          error: error instanceof Error ? error.message : "Unknown Outlook sync error.",
        });
      }
    }
    return Response.json({
      source: "outlook",
      targetUser: settings.targetUser,
      timeZone: settings.timeZone,
      preview,
      applied,
      failed,
      count: applied.length,
    }, { status: failed.length ? 207 : 200 });
  } catch (error) {
    const providerFailure = microsoftGraphFailureLog(error);
    if (providerFailure) console.error("Outlook change review failed", providerFailure);
    const failure = microsoftGraphFailureResponse(error, "Outlook synchronization failed.");
    return Response.json(failure.body, { status: failure.status });
  }
}
