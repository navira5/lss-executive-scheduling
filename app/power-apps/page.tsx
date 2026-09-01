import type { Metadata } from "next";

import { ScenarioSwitcher } from "@/app/components/ScenarioSwitcher";
import { requireDemoSession } from "@/app/demo-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LSS Power Apps + PCF Calendar Preview",
  description: "A working comparison preview of the LSS planner inside a Power Apps-style shell with a custom calendar surface.",
};

export default async function PowerAppsPreviewPage() {
  await requireDemoSession("/power-apps");
  return (
    <main className="power-preview-shell">
      <ScenarioSwitcher current="power-apps" />
      <div className="power-preview-note">
        <strong>Option C comparison preview</strong>
        <span>This demonstrates the Power Apps shell and custom-calendar direction. It is not connected to a live Power Platform environment.</span>
      </div>
      <iframe
        className="power-preview-frame"
        title="LSS Power Apps and custom PCF calendar comparison"
        src="/power-apps-preview/index.html"
        sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
      />
    </main>
  );
}
