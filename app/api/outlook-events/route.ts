import { importedEventFromOutlook, type OutlookEventFields } from "@/lib/outlook-sync";
import { requireDemoApiSession } from "@/app/demo-auth";
import {
  microsoftGraphFailureLog,
  microsoftGraphFailureResponse,
  microsoftGraphRequestError,
} from "@/lib/microsoft-graph-error";

interface GraphCollection<T> {
  value?: T[];
  "@odata.nextLink"?: string;
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

async function graphCollection<T>(pathOrUrl: string, token: string, timeZone: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = pathOrUrl;
  while (next) {
    const url = next.startsWith("https://") ? next : `${GRAPH_ROOT}${next}`;
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        prefer: `outlook.timezone="${timeZone}"`,
      },
    });
    if (!response.ok) throw await microsoftGraphRequestError(response, "read");
    const page = await response.json() as GraphCollection<T>;
    items.push(...(page.value ?? []));
    next = page["@odata.nextLink"];
  }
  return items;
}

function calendarViewPath(settings: ReturnType<typeof config>): string {
  const user = encodeURIComponent(settings.targetUser);
  const calendarPart = settings.calendarId
    ? `/calendars/${encodeURIComponent(settings.calendarId)}`
    : "";
  const params = new URLSearchParams({
    startDateTime: "2027-01-01T00:00:00",
    endDateTime: "2028-01-01T00:00:00",
    "$top": "50",
    "$select": "id,iCalUId,subject,isAllDay,start,end,location,organizer,attendees,body,bodyPreview,recurrence",
    "$orderby": "start/dateTime",
  });
  return `/users/${user}${calendarPart}/calendarView?${params.toString()}`;
}

export async function GET(): Promise<Response> {
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

  try {
    const token = await accessToken(settings);
    const rows = await graphCollection<OutlookEventFields>(
      calendarViewPath(settings),
      token,
      settings.timeZone,
    );
    const events = rows
      .map((event) => importedEventFromOutlook(event))
      .filter((event): event is NonNullable<typeof event> => event !== null);
    return Response.json({
      source: "outlook",
      targetUser: settings.targetUser,
      timeZone: settings.timeZone,
      events,
      count: events.length,
    });
  } catch (error) {
    const providerFailure = microsoftGraphFailureLog(error);
    if (providerFailure) console.error("Outlook calendar read failed", providerFailure);
    const failure = microsoftGraphFailureResponse(error, "Outlook calendar import failed.");
    return Response.json(failure.body, { status: failure.status });
  }
}
