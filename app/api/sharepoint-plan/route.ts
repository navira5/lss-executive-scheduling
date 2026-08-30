import { calendarPlanFromSharePoint } from "@/lib/sharepoint-plan";
import type { SharePointFields } from "@/lib/sharepoint-plan";

interface GraphSite {
  id: string;
}

interface GraphList {
  id: string;
  name?: string;
  displayName?: string;
}

interface GraphCollection<T> {
  value?: T[];
  "@odata.nextLink"?: string;
}

interface GraphListItem {
  fields?: SharePointFields;
}

const DEFAULT_SITE_HOSTNAME = "abbasi1010.sharepoint.com";
const DEFAULT_SITE_PATH = "/sites/LSSSchedulingDemo";
const DEFAULT_MEETING_TYPES_LIST = "LSS Meeting Types";
const DEFAULT_HOLIDAYS_LIST = "LSS Holidays and Closures";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function config() {
  const tenantId = env("MICROSOFT_TENANT_ID") || env("MS_TENANT_ID");
  const clientId = env("MICROSOFT_CLIENT_ID") || env("MS_CLIENT_ID");
  const clientSecret = env("MICROSOFT_CLIENT_SECRET") || env("MS_CLIENT_SECRET");
  return {
    tenantId,
    clientId,
    clientSecret,
    siteHostname: env("SHAREPOINT_SITE_HOSTNAME") || DEFAULT_SITE_HOSTNAME,
    sitePath: env("SHAREPOINT_SITE_PATH") || DEFAULT_SITE_PATH,
    meetingTypesList: env("SHAREPOINT_MEETING_TYPES_LIST") || DEFAULT_MEETING_TYPES_LIST,
    holidaysList: env("SHAREPOINT_HOLIDAYS_LIST") || DEFAULT_HOLIDAYS_LIST,
  };
}

async function accessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Microsoft identity token request failed with ${response.status}.`);
  }
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Microsoft identity token response did not include an access token.");
  return payload.access_token;
}

async function graphGet<T>(pathOrUrl: string, token: string): Promise<T> {
  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `https://graph.microsoft.com/v1.0${pathOrUrl}`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Microsoft Graph request failed with ${response.status}: ${url}`);
  }
  return response.json() as Promise<T>;
}

async function graphCollection<T>(path: string, token: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = path;
  while (next) {
    const page = await graphGet<GraphCollection<T>>(next, token);
    items.push(...(page.value ?? []));
    next = page["@odata.nextLink"];
  }
  return items;
}

function graphSitePath(hostname: string, sitePath: string): string {
  const cleanPath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;
  return `/sites/${hostname}:${cleanPath}`;
}

async function findList(siteId: string, listName: string, token: string): Promise<GraphList> {
  const lists = await graphCollection<GraphList>(
    `/sites/${encodeURIComponent(siteId)}/lists?$select=id,name,displayName`,
    token,
  );
  const match = lists.find((list) =>
    list.displayName === listName || list.name === listName,
  );
  if (!match) throw new Error(`SharePoint list "${listName}" was not found.`);
  return match;
}

async function listFields(siteId: string, listId: string, token: string): Promise<SharePointFields[]> {
  const items = await graphCollection<GraphListItem>(
    `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items?$expand=fields`,
    token,
  );
  return items.map((item) => item.fields ?? {});
}

export async function GET(): Promise<Response> {
  const settings = config();
  if (!settings.tenantId || !settings.clientId || !settings.clientSecret) {
    return Response.json({
      error: "SharePoint integration is not configured.",
      missing: [
        !settings.tenantId ? "MICROSOFT_TENANT_ID" : "",
        !settings.clientId ? "MICROSOFT_CLIENT_ID" : "",
        !settings.clientSecret ? "MICROSOFT_CLIENT_SECRET" : "",
      ].filter(Boolean),
    }, { status: 503 });
  }

  try {
    const token = await accessToken(settings.tenantId, settings.clientId, settings.clientSecret);
    const site = await graphGet<GraphSite>(
      graphSitePath(settings.siteHostname, settings.sitePath),
      token,
    );
    const [meetingList, holidayList] = await Promise.all([
      findList(site.id, settings.meetingTypesList, token),
      findList(site.id, settings.holidaysList, token),
    ]);
    const [meetingRows, holidayRows] = await Promise.all([
      listFields(site.id, meetingList.id, token),
      listFields(site.id, holidayList.id, token),
    ]);
    const result = calendarPlanFromSharePoint(meetingRows, holidayRows);
    return Response.json({
      source: "sharepoint",
      generatedAt: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "SharePoint integration failed.",
    }, { status: 502 });
  }
}
