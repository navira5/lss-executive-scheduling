import { requireDemoApiSession } from "@/app/demo-auth";
import { newSharePointMeetingFields, sharePointRuleFields } from "@/lib/sharepoint-plan";
import type { WorkingMeetingRule } from "@/lib/plan-year";
import type { MeetingTemplate } from "@/lib/types";

interface RuleWriteInput {
  template: MeetingTemplate;
  rule: WorkingMeetingRule;
}

interface GraphSite { id: string }
interface GraphList { id: string; name?: string; displayName?: string }
interface GraphItem { id: string; fields?: Record<string, unknown> }
interface GraphCollection<T> { value?: T[]; "@odata.nextLink"?: string }

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function config() {
  return {
    tenantId: env("MICROSOFT_TENANT_ID") || env("MS_TENANT_ID"),
    clientId: env("MICROSOFT_CLIENT_ID") || env("MS_CLIENT_ID"),
    clientSecret: env("MICROSOFT_CLIENT_SECRET") || env("MS_CLIENT_SECRET"),
    siteHostname: env("SHAREPOINT_SITE_HOSTNAME") || "abbasi1010.sharepoint.com",
    sitePath: env("SHAREPOINT_SITE_PATH") || "/sites/LSSSchedulingDemo",
    meetingTypesList: env("SHAREPOINT_MEETING_TYPES_LIST") || "LSS Meeting Types",
  };
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

async function graphGet<T>(pathOrUrl: string, token: string): Promise<T> {
  const response = await fetch(pathOrUrl.startsWith("https://") ? pathOrUrl : `${GRAPH_ROOT}${pathOrUrl}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Microsoft Graph SharePoint request failed with ${response.status}.`);
  return response.json() as Promise<T>;
}

async function graphCollection<T>(path: string, token: string): Promise<T[]> {
  const rows: T[] = [];
  let next: string | undefined = path;
  while (next) {
    const page = await graphGet<GraphCollection<T>>(next, token);
    rows.push(...(page.value ?? []));
    next = page["@odata.nextLink"];
  }
  return rows;
}

async function graphWrite(method: "POST" | "PATCH", path: string, token: string, body: unknown): Promise<void> {
  const response = await fetch(`${GRAPH_ROOT}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`SharePoint rule write failed with ${response.status}${detail ? `: ${detail.slice(0, 220)}` : ""}`);
  }
}

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireDemoApiSession();
  if (unauthorized) return unauthorized;
  const settings = config();
  if (!settings.tenantId || !settings.clientId || !settings.clientSecret) {
    return Response.json({ error: "SharePoint integration is not configured." }, { status: 503 });
  }
  const payload = await request.json().catch(() => null) as { confirm?: boolean; rules?: RuleWriteInput[] } | null;
  if (!payload || payload.confirm !== true) {
    return Response.json({ error: "Saving organizational rules requires explicit confirmation." }, { status: 400 });
  }
  const rules = payload.rules ?? [];
  if (!rules.length) return Response.json({ updated: [], created: [], count: 0 });

  try {
    const token = await accessToken(settings);
    const sitePath = settings.sitePath.startsWith("/") ? settings.sitePath : `/${settings.sitePath}`;
    const site = await graphGet<GraphSite>(`/sites/${settings.siteHostname}:${sitePath}`, token);
    const lists = await graphCollection<GraphList>(`/sites/${encodeURIComponent(site.id)}/lists?$select=id,name,displayName`, token);
    const list = lists.find((candidate) => candidate.displayName === settings.meetingTypesList || candidate.name === settings.meetingTypesList);
    if (!list) throw new Error(`SharePoint list "${settings.meetingTypesList}" was not found.`);
    const items = await graphCollection<GraphItem>(`/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(list.id)}/items?$expand=fields($select=Title,Notes)`, token);
    const updated: string[] = [];
    const created: string[] = [];
    for (const input of rules) {
      const matches = items.filter((item) => item.fields?.Title === input.template.name);
      if (matches.length > 1) throw new Error(`More than one SharePoint rule is named "${input.template.name}".`);
      if (matches.length === 1) {
        await graphWrite(
          "PATCH",
          `/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(list.id)}/items/${encodeURIComponent(matches[0].id)}/fields`,
          token,
          sharePointRuleFields(
            input.template,
            input.rule,
            typeof matches[0].fields?.Notes === "string" ? matches[0].fields.Notes : "",
          ),
        );
        updated.push(input.template.name);
      } else {
        await graphWrite(
          "POST",
          `/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(list.id)}/items`,
          token,
          { fields: newSharePointMeetingFields(input.template, input.rule) },
        );
        created.push(input.template.name);
      }
    }
    return Response.json({ source: "sharepoint", updated, created, count: updated.length + created.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SharePoint rule synchronization failed.";
    const permission = /403/.test(message) ? "Add and grant the Microsoft Graph application permission Sites.ReadWrite.All." : undefined;
    return Response.json({ error: message, permission }, { status: 502 });
  }
}
