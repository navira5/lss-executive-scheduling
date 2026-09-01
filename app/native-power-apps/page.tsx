import type { Metadata } from "next";

import { ScenarioSwitcher } from "@/app/components/ScenarioSwitcher";
import { requireDemoSession } from "@/app/demo-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LSS Native Power Apps Calendar Preview",
  description: "A comparison preview of the LSS planner using standard Power Apps controls and Microsoft connectors without a custom PCF component.",
};

export default async function NativePowerAppsPreviewPage() {
  await requireDemoSession("/native-power-apps");
  return (
    <main className="power-preview-shell">
      <ScenarioSwitcher current="native-power-apps" />
      <div className="power-preview-note native">
        <strong>Option C comparison preview</strong>
        <span>Standard Canvas App controls and Microsoft connectors only. No custom PCF calendar and no drag-and-drop.</span>
      </div>
      <iframe
        className="power-preview-frame"
        title="LSS native Power Apps calendar comparison"
        src="/native-power-apps-preview/index.html"
        sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
      />
    </main>
  );
}
