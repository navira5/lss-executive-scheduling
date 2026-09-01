import type { Metadata } from "next";

import { CalendarPlanner } from "@/app/CalendarPlanner";
import { requireDemoSession } from "@/app/demo-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LSS 2027 Standalone Calendar Planner",
  description: "A self-contained 2027 planning workspace with browser-local state and file-based calendar exchange.",
};

export default async function StandalonePlannerPage() {
  const session = await requireDemoSession("/standalone");
  return <CalendarPlanner viewerName={session.username} mode="standalone" />;
}
