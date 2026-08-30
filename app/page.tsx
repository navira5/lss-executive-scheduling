import type { Metadata } from "next";
import { CalendarPlanner } from "./CalendarPlanner";
import { requireDemoSession } from "./demo-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LSS 2027 Calendar Planning Workbench",
  description:
    "A rules-first working draft for Lutheran Social Services of Central Ohio's 2027 governance and organizational calendar.",
};

export default async function Home() {
  const session = await requireDemoSession("/");
  return (
    <CalendarPlanner
      viewerName={session.username}
      outlookPublishEnabled={process.env.OUTLOOK_PUBLISH_ENABLED?.trim().toLowerCase() === "true"}
      powerAppUrl={process.env.POWER_APP_URL?.trim() ?? ""}
    />
  );
}
