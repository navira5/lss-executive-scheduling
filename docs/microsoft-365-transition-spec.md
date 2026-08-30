# LSS Executive Scheduling POC: Microsoft 365 Transition Spec

Date: 2026-08-29

## Current POC

The current application is a Next/React proof of concept for the 2027 annual planning calendar. It generates proposed meeting dates from rule templates, displays a year-at-a-glance calendar, lets the user adjust meetings by drag/drop, preserves human approval state, imports an Outlook `.ics` snapshot locally, and exports confirmed meetings to PDF/ICS.

The POC separates:

- meeting rules, holidays, assumptions, and decisions;
- generated calendar events;
- human review/approval state;
- Outlook snapshot data, which is parsed in the browser and not uploaded.

## Microsoft 365 Fit

### SharePoint / Microsoft Lists

SharePoint is a good fit for the business-maintained data:

- meeting types and rules;
- holiday and closure dates;
- open decisions and validation notes;
- assumptions and source references;
- lightweight generated event review lists.

Microsoft documents that Power Apps can create a responsive canvas app directly from SharePoint/Microsoft Lists data, with browse, detail, add, edit, and delete operations created automatically. This matches the Felise-maintained rulebook use case.

SharePoint should not own the scheduling algorithm itself. Lists can store the rules, but the rule engine still needs deterministic logic for recurrence, holidays, collisions, source-status handling, and export eligibility.

### Power Apps

A Power Apps canvas app is a reasonable internal admin interface for maintaining rules. It can connect to SharePoint lists using standard Microsoft 365 authentication and can be embedded in SharePoint web pages in supported browser contexts.

Power Apps is less suitable for replicating the full current planning workspace without compromise:

- dense 3 x 4 year planning canvas;
- polished drag/drop calendar movement;
- complex recurrence generation;
- conflict detection between overlapping leadership groups;
- local `.ics` parsing;
- guarded AI-assisted proposal flow;
- rich PDF/ICS export behavior.

Those can be built around Power Apps with custom connectors/components/flows, but at that point the low-code advantage becomes weaker.

### Power Pages

Power Pages is mainly for external-facing Dataverse-backed websites. The LSS use case appears internal: Rachel, Kim, Felise, Chad, and other LSS staff using existing Microsoft 365 accounts. Unless LSS needs an external portal for non-staff users, Power Pages is probably not the right first target.

### Microsoft Fabric

Fabric is valuable for analytics and reporting. Microsoft positions Dataverse-to-Fabric as a way to make Power Apps/Dynamics data available in OneLake, with Fabric lakehouse, SQL endpoint, and Power BI reporting scenarios.

Fabric is not the simplest first operational database for this POC. If LSS wants a low-code operational app, Dataverse or SharePoint Lists are the more natural Power Platform stores. If LSS wants SQL, the SQL Server connector is premium in Power Apps/Power Automate, and Fabric SQL database has current limitations that Chad should validate against LSS licensing, region, capacity, backup, and ALM requirements.

## Recommended Architecture

Use a hybrid Microsoft 365 architecture:

1. SharePoint Lists hold LSS-maintained rule data.
2. The existing custom app reads those lists through Microsoft Graph or a server-side integration.
3. Microsoft Entra ID provides single-tenant sign-in with LSS Microsoft 365 accounts.
4. Power Apps provides a simple rule-maintenance/admin experience for Felise.
5. Power Automate can handle simple notifications, approval routing, and possible calendar-export workflows.
6. Fabric/Power BI can be added later for reporting on meeting volume, unresolved decisions, and annual planning history.

This lets LSS own the data in Microsoft 365 while preserving the custom planner where it provides the most value.

## App Integration Boundary

The POC now includes an optional server-side SharePoint bridge at:

- `/api/sharepoint-plan`
- `/api/outlook-events`
- `/api/outlook-publish`

When Microsoft Graph credentials are configured, the planner can load:

- `LSS Meeting Types`
- `LSS Holidays and Closures`

and generate the annual calendar from those SharePoint rows. It can also retrieve existing Outlook calendar events before planning and publish approved planner events back to Outlook after explicit human confirmation. When credentials are not configured, the app keeps using the built-in POC rulebook data and shows a clear fallback status.

Implementation status is not the same as live connectivity. As of the 2026-08-30 checkpoint, the Graph routes and local contract tests exist, but this repository has no `.env.local` and no successful live SharePoint or Outlook authentication receipt. Live validation remains required.

Required environment variables:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `SHAREPOINT_SITE_HOSTNAME`, default: `abbasi1010.sharepoint.com`
- `SHAREPOINT_SITE_PATH`, default: `/sites/LSSSchedulingDemo`
- `SHAREPOINT_MEETING_TYPES_LIST`, default: `LSS Meeting Types`
- `SHAREPOINT_HOLIDAYS_LIST`, default: `LSS Holidays and Closures`
- `OUTLOOK_TARGET_USER`, mailbox user principal name used for the demo calendar, such as `felise@...`
- `OUTLOOK_CALENDAR_ID`, optional; leave blank to use the mailbox default calendar
- `OUTLOOK_TIME_ZONE`, default: `Eastern Standard Time`
- `OUTLOOK_PUBLISH_ENABLED`, default: `false`; set to `true` only for an approved test mailbox

Use `.env.local.example` as the starting template for local development.

The Microsoft Entra app registration should use Microsoft Graph application permissions that allow reading the SharePoint site/list data and reading/writing the selected Outlook mailbox calendar. For the demo, this is likely `Sites.Read.All` plus `Calendars.ReadWrite` application permission with admin consent. For production, Chad should evaluate least-privilege site-specific permissions, Exchange application access policies, calendar ownership, audit requirements, and the consent/admin process preferred by LSS.

No Microsoft secret is exposed to the browser. The browser calls the app route, and the app route calls Microsoft Graph.

Outlook writes are intentionally explicit. The planner retrieves existing events with `calendarView`, keeps them visible as Outlook context, and only creates events when the user clicks `Publish Approved to Outlook`. The server also requires `OUTLOOK_PUBLISH_ENABLED=true`. The payload is limited to confirmed, export-eligible meetings. Unresolved/open-question meetings are excluded. The current adapter creates new events and has not yet been live-validated; it does not update existing events in place or perform Graph-backed duplicate detection.

## SharePoint Lists

### LSS Meeting Types

Use the existing list and import `sharepoint-import/lss-meeting-types-sharepoint.csv`. The CSV matches the columns Navira created:

- Title
- Category
- Purpose
- Leader
- Attendees
- Cadence
- FrequencyDetail
- DefaultMonth
- DayOfWeek
- WeekOfMonth
- PreferredTime
- DurationMinutes
- Modality
- Location
- AttendanceRule
- Flexibility
- RuleStatus
- UpstreamDependency
- DownstreamDependency
- HolidayHandling
- Notes

### LSS Holidays and Closures

Recommended columns:

- Title
- Date
- Status

Import `sharepoint-import/lss-holidays-2027.csv`. The current POC includes verified 2027 federal holidays plus projected LSS closures from 2026. Projected LSS closures should be validated before production use.

### LSS Planning Decisions

Recommended columns:

- Title
- DecisionId
- Severity
- Summary
- Question
- Source
- RelatedMeetingId
- RelatedEventId

Import `sharepoint-import/lss-decision-items.csv`.

### LSS Planning Assumptions

Recommended columns:

- Title
- AssumptionId
- Value
- Rationale
- Authority

Import `sharepoint-import/lss-assumptions.csv`.

### LSS Generated Events

Optional for demo/review. Recommended columns:

- Title
- EventId
- MeetingId
- Date
- OriginalDate
- Time
- Abbreviation
- Category
- Status
- RuleStatus
- Leader
- Attendees
- DurationMinutes
- Modality
- Location
- Conflicts
- Alternatives
- Assumptions
- Explanation

Import `sharepoint-import/lss-generated-events-2027.csv` only if Chad wants to see the generated working draft inside SharePoint.

## Chad-Facing Position

The application can partially transition to the Microsoft 365 platform now. The right first move is not a full rewrite into Power Apps. The right first move is to make SharePoint the source of truth for meeting rules, holidays, decisions, and assumptions, then keep the custom planner as the scheduling experience.

That gives Chad's team Microsoft 365 ownership, backup, permissions, and familiar data maintenance, while avoiding a rushed rebuild of the highest-risk part of the product: the calendar planning engine.

## Microsoft References

- Power Apps can create apps from SharePoint/Microsoft Lists data: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/app-from-sharepoint
- Power Apps connector overview and connector limits: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/connections-list
- Power Apps embedding limits: https://learn.microsoft.com/en-us/power-apps/limits-and-config
- Dataverse link to Microsoft Fabric: https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-link-view-in-fabric
- Configure Link to Fabric: https://learn.microsoft.com/en-us/power-apps/maker/data-platform/fabric-link-to-data-platform
- SQL Server connector class/licensing: https://learn.microsoft.com/en-us/connectors/sql/
- Fabric SQL database limitations: https://learn.microsoft.com/en-nz/fabric/database/sql/limitations
- Power Pages overview: https://learn.microsoft.com/en-us/power-pages/
