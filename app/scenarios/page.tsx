import type { Metadata } from "next";

import { ScenarioSwitcher } from "@/app/components/ScenarioSwitcher";
import { requireDemoSession } from "@/app/demo-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LSS Calendar Planner Delivery Options",
  description: "Compare standalone, Microsoft-connected, and Power Platform delivery options for the LSS calendar planner.",
};

const options = [
  {
    letter: "A",
    title: "Standalone planner",
    tag: "Ready for feedback now",
    description: "The complete planning experience without a Microsoft connection. Work stays in the tester’s browser and moves through downloadable files.",
    includes: ["Temporary login", "PDF and calendar export", "Calendar-file import", "SharePoint-ready rules CSV"],
    tradeoff: "Manual file handoffs and no shared live plan.",
    href: "/standalone",
    action: "Open standalone planner",
  },
  {
    letter: "B",
    title: "Microsoft-connected planner",
    tag: "Best version of the custom UX",
    description: "The same rich planner connected to SharePoint rules and an Outlook calendar through Microsoft Graph, with human review before publishing.",
    includes: ["SharePoint rules", "Outlook planning context", "Reviewed Outlook publishing", "Full drag-and-drop planner"],
    tradeoff: "LSS IT owns deployment, permissions, monitoring, and support.",
    href: "/",
    action: "Open connected planner",
  },
  {
    letter: "C",
    title: "Power Apps + custom calendar",
    tag: "Microsoft-native direction",
    description: "A Power Apps shell for rules and workflow, with a custom PCF calendar component preserving the year view and richer planning interactions.",
    includes: ["Power Apps interface", "Microsoft identity", "Business-owned rule forms", "Custom year-calendar component"],
    tradeoff: "Still custom development; LSS IT deploys and maintains the PCF solution.",
    href: "/power-apps",
    action: "Open Power Apps preview",
  },
] as const;

export default async function ScenarioOptionsPage() {
  await requireDemoSession("/scenarios");
  return (
    <main className="scenario-page">
      <ScenarioSwitcher current="overview" />
      <section className="scenario-intro">
        <p className="eyebrow">LSS 2027 CALENDAR PLANNER</p>
        <h1>One planning workflow. Three ways LSS could own it.</h1>
        <p>These are delivery options—not three different products. Each preserves the rules-first calendar workflow while changing integration, ownership, and ongoing support.</p>
      </section>
      <section className="scenario-card-grid" aria-label="Planner delivery options">
        {options.map((option) => (
          <article className={`scenario-card option-${option.letter.toLowerCase()}`} key={option.letter}>
            <div className="scenario-card-heading">
              <span>{option.letter}</span>
              <div><small>{option.tag}</small><h2>{option.title}</h2></div>
            </div>
            <p>{option.description}</p>
            <ul>
              {option.includes.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className="scenario-tradeoff"><strong>Tradeoff</strong><span>{option.tradeoff}</span></div>
            <a className="scenario-open" href={option.href}>{option.action}<span aria-hidden="true">→</span></a>
          </article>
        ))}
      </section>
      <p className="scenario-scope-note"><strong>Recommended boundary:</strong> Navira provides the prototype, source, and handoff documentation. LSS owns production deployment, Microsoft permissions, and ongoing maintenance.</p>
    </main>
  );
}
