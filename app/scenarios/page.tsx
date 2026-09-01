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
    tradeoff: "Every update moves by file. There is no shared live source of truth, so duplicate files and version conflicts become more likely as more people use it.",
    effort: "Low IT · higher manual work",
    timeline: "Available now for POC use",
    support: "POC: Navira · after handoff: named LSS owner",
    agentRole: "Optional for future code changes; not needed for normal file-based use.",
    href: "/standalone",
    action: "Open standalone planner",
  },
  {
    letter: "B",
    title: "Microsoft-connected planner",
    tag: "Best version of the custom UX",
    description: "The same rich planner connected to SharePoint rules and an Outlook calendar through Microsoft Graph, with human review before publishing.",
    includes: ["SharePoint rules", "Outlook planning context", "Reviewed Outlook publishing", "Full drag-and-drop planner"],
    tradeoff: "LSS IT must own hosting, Entra and Graph permissions, monitoring, and outages. When an integration fails, it becomes an LSS IT support issue.",
    effort: "Medium",
    timeline: "Weeks, after LSS IT setup and review",
    support: "LSS IT",
    agentRole: "Can accelerate app fixes; Microsoft access, security decisions, and incidents still require LSS IT.",
    href: "/integrated",
    action: "Open connected planner",
  },
  {
    letter: "C",
    title: "Native Power Apps planner",
    tag: "Lowest custom-code burden",
    description: "A Canvas App using standard Power Apps controls, SharePoint or Dataverse, and Outlook connectors—with no custom calendar component.",
    includes: ["Microsoft identity", "SharePoint or Dataverse rules", "Outlook calendar view", "Form-based date changes"],
    tradeoff: "Rachel can apply rules and see meetings refresh, but she works month by month and changes dates through forms. There is no drag-and-drop or polished 3×4 year view.",
    effort: "Low–medium",
    timeline: "Weeks, after LSS setup and review",
    support: "LSS Power Platform admin",
    agentRole: "Can help draft Power Fx formulas, screens, flows, tests, and documentation. An LSS maker or admin still reviews and publishes changes.",
    href: "/native-power-apps",
    action: "Open native Power Apps preview",
  },
  {
    letter: "D",
    title: "Power Apps + custom calendar",
    tag: "Microsoft-native direction",
    description: "A Power Apps shell for rules and workflow, with a custom Power Apps Component Framework (PCF) calendar preserving the year view and richer planning interactions.",
    includes: ["Power Apps interface", "Microsoft identity", "Business-owned rule forms", "Custom year-calendar component"],
    tradeoff: "This carries the highest maintenance burden. LSS owns Power Platform plus a TypeScript component that a developer must test, package, and deploy.",
    effort: "High",
    timeline: "Months for a production-ready solution",
    support: "LSS IT + developer",
    agentRole: "Strong fit for coding agents: they can draft PCF UI changes, fixes, tests, and documentation. A developer still reviews and deploys the work.",
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
        <h1>One planning workflow. Four ways LSS could own it.</h1>
        <p>These are delivery options—not four different products. Each preserves the rules-first calendar workflow while changing integration, ownership, user experience, and ongoing support.</p>
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
      <section className="scenario-commitment" aria-labelledby="commitment-heading">
        <div className="scenario-commitment-heading">
          <p className="eyebrow">LONG-TERM COMMITMENT</p>
          <h2 id="commitment-heading">What LSS is signing up to own</h2>
          <p>Relative estimates for production—not vendor quotes. Timing depends on LSS security, access, and deployment review.</p>
        </div>
        <div className="scenario-comparison-scroll">
          <table className="scenario-comparison">
            <thead>
              <tr><th scope="col">Decision</th>{options.map((option) => <th scope="col" key={option.letter}>{option.letter} · {option.title}</th>)}</tr>
            </thead>
            <tbody>
              <tr><th scope="row">Ongoing LSS effort</th>{options.map((option) => <td key={option.letter}>{option.effort}</td>)}</tr>
              <tr><th scope="row">Time to production</th>{options.map((option) => <td key={option.letter}>{option.timeline}</td>)}</tr>
              <tr><th scope="row">Who gets called</th>{options.map((option) => <td key={option.letter}>{option.support}</td>)}</tr>
              <tr className="agent-row"><th scope="row">Where coding agents help</th>{options.map((option) => <td key={option.letter}>{option.agentRole}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>
      <p className="scenario-scope-note"><strong>Recommended boundary:</strong> Navira provides the prototype, source, and handoff documentation. LSS owns production deployment, Microsoft permissions, and ongoing maintenance.</p>
    </main>
  );
}
