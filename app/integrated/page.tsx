import type { Metadata } from "next";

import { CalendarPlanner } from "@/app/CalendarPlanner";
import { ScenarioSwitcher } from "@/app/components/ScenarioSwitcher";
import { requireDemoSession } from "@/app/demo-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LSS 2027 Microsoft-Connected Calendar Planner",
  description: "The LSS calendar planning experience with optional SharePoint and Outlook integration.",
};

export default async function IntegratedPlannerPage() {
  const session = await requireDemoSession("/integrated");
  return (
    <>
      <ScenarioSwitcher current="integrated" />
      <CalendarPlanner
        viewerName={session.username}
        outlookPublishEnabled={process.env.OUTLOOK_PUBLISH_ENABLED?.trim().toLowerCase() === "true"}
        powerAppUrl={process.env.POWER_APP_URL?.trim() ?? ""}
      />
    </>
  );
}
