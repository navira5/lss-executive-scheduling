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
    title: "Use the planner as it is today",
    tag: "Ready to test now",
    description: "The full planner works today, but it is not connected to LSS systems. Calendar information is moved in and out using files.",
    includes: ["Full year-at-a-glance planner", "Drag and move meetings", "See scheduling warnings", "Download the finished calendar"],
    tradeoff: "Changes are shared through files instead of automatically updating one shared LSS calendar. This works well for testing, but becomes harder to manage with several people using it.",
    effort: "Low IT · higher manual work",
    timeline: "Available now for POC use",
    support: "POC: Navira · after handoff: named LSS owner",
    agentRole: "Optional for future code changes; not needed for normal file-based use.",
    href: "/standalone",
    action: "Open planner",
  },
  {
    letter: "B",
    title: "Keep the planner and connect it to LSS",
    tag: "Best version of the current experience",
    description: "Keep the planner you see today, but connect it to LSS rules and Outlook so information can move automatically between systems.",
    includes: ["Full year-at-a-glance planner", "Drag and move meetings", "Uses rules stored by LSS", "Meetings reach Outlook only after approval"],
    tradeoff: "LSS would need to own and support this as a separate application. It gives you the richest experience, but requires more IT support behind the scenes.",
    effort: "Medium",
    timeline: "Weeks, after LSS IT setup and review",
    support: "LSS IT",
    agentRole: "Can accelerate app fixes; Microsoft access, security decisions, and incidents still require LSS IT.",
    href: "/integrated",
    action: "Open connected planner",
  },
  {
    letter: "C",
    title: "Build it using standard Microsoft tools",
    tag: "Easiest for LSS to maintain",
    description: "Build the planner mostly with tools already provided by Microsoft. LSS staff could update rules and meeting information without needing a developer for most changes.",
    includes: ["Sign in with an LSS account", "Rules kept in one shared LSS location", "Add, edit, cancel, and delete events", "Connects with Outlook"],
    tradeoff: "The planner would be simpler. The calendar shows one month at a time, with an annual list for all meetings. Moving a meeting uses a form instead of drag-and-drop.",
    effort: "Low–medium",
    timeline: "Weeks, after LSS setup and review",
    support: "LSS Power Platform admin",
    agentRole: "Can help draft Power Fx formulas, screens, flows, tests, and documentation. An LSS maker or admin still reviews and publishes changes.",
    href: "/native-power-apps",
    action: "See Microsoft version",
  },
  {
    letter: "D",
    title: "Build it in Microsoft, but keep the custom calendar",
    tag: "Best balance of experience + LSS ownership",
    description: "Build most of the application using Microsoft tools, but keep a custom calendar so planning still feels like the current planner.",
    includes: ["Sign in with an LSS account", "Full year-at-a-glance planner", "Drag and move meetings", "Staff can update rules themselves"],
    tradeoff: "Most of the app would be easier for LSS to manage. The custom calendar is the one part that may still occasionally need help from a developer or coding agent.",
    effort: "High",
    timeline: "Months for a production-ready solution",
    support: "LSS IT + developer",
    agentRole: "Strong fit for coding agents: they can draft PCF UI changes, fixes, tests, and documentation. A developer still reviews and deploys the work.",
    href: "/power-apps",
    action: "See Microsoft + custom calendar",
    recommended: true,
  },
] as const;

const capabilities = [
  {
    feature: "Plan one layer at a time",
    a: ["Retained", "Board first, then later meeting layers."],
    b: ["Retained", "Same guided confirmation workflow."],
    c: ["Retained", "Standard screens and status fields can gate each layer."],
    d: ["Retained", "Power Apps workflow around the custom calendar."],
  },
  {
    feature: "Edit rules and cadence",
    a: ["Retained", "Edit rules beside the calendar."],
    b: ["Retained", "Edits can update the shared LSS rule source after confirmation."],
    c: ["Retained", "Standard forms are well suited to rule maintenance."],
    d: ["Retained", "Standard forms can sit beside the custom calendar."],
  },
  {
    feature: "Rule-generated meetings",
    a: ["Retained", "Rules generate individual 2027 occurrences."],
    b: ["Retained", "Same planner engine with SharePoint rules."],
    c: ["Retained", "Power Fx or a flow creates proposed records."],
    d: ["Retained", "Power Apps data with custom-calendar rendering."],
  },
  {
    feature: "Add, edit, cancel, delete events",
    a: ["Retained", "Direct calendar actions."],
    b: ["Retained", "Direct actions with reviewed Outlook changes."],
    c: ["Adapted", "Standard forms; deletions enter the review queue."],
    d: ["Retained", "Custom calendar actions plus approval."],
  },
  {
    feature: "Holidays and LSS closures",
    a: ["Retained", "Visible cells and hard blocks."],
    b: ["Retained", "Visible cells and hard blocks."],
    c: ["Adapted", "List records, calendar color, validation on save."],
    d: ["Retained", "Custom calendar cells and validation."],
  },
  {
    feature: "See the full planning year",
    a: ["Retained", "Spatial 3×4 calendar."],
    b: ["Retained", "Spatial 3×4 calendar."],
    c: ["Adapted", "Month grid plus sortable All 2027 list."],
    d: ["Retained", "Spatial 3×4 custom component."],
  },
  {
    feature: "Move a meeting",
    a: ["Retained", "Drag, land, then choose rule or one-off."],
    b: ["Retained", "Same, with Outlook review."],
    c: ["Adapted", "Open event form, choose date, save, refresh."],
    d: ["Retained", "PCF can preserve drag-and-drop."],
  },
  {
    feature: "Conflict and holiday warnings",
    a: ["Retained", "Immediate on placement and rule changes."],
    b: ["Retained", "Immediate, with Outlook context."],
    c: ["Adapted", "Formula or flow checks on Apply and Save."],
    d: ["Retained", "Immediate custom interaction."],
  },
  {
    feature: "Human approval before Outlook",
    a: ["Manual", "Download and upload calendar file."],
    b: ["Retained", "Graph review queue before publishing."],
    c: ["Retained", "Connector or Power Automate approval flow."],
    d: ["Retained", "Power Platform approval flow."],
  },
  {
    feature: "Bring in existing calendar context",
    a: ["Manual", "Import an ICS calendar file."],
    b: ["Retained", "Read approved Outlook calendar context."],
    c: ["Retained", "Outlook connector loads events into a gallery or calendar."],
    d: ["Retained", "Connector data appears in the custom calendar."],
  },
  {
    feature: "PDF, calendar, and rules handoff",
    a: ["Retained", "Download PDF, ICS, and rules CSV files."],
    b: ["Retained", "Files plus reviewed direct publishing."],
    c: ["Adapted", "Power Automate generates files and approval handoffs."],
    d: ["Adapted", "Power Automate handles the same outputs."],
  },
  {
    feature: "Rules source of truth",
    a: ["Manual", "Rules CSV handoff."],
    b: ["Retained", "SharePoint through Graph."],
    c: ["Retained", "Native SharePoint or Dataverse connection."],
    d: ["Retained", "Dataverse or SharePoint."],
  },
  {
    feature: "Meeting-fit advisor",
    a: ["Custom", "Planner scheduling engine."],
    b: ["Custom", "Planner engine plus calendar context."],
    c: ["Custom", "Needs Power Automate or a small service."],
    d: ["Custom", "Needs the same rule-evaluation engine."],
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
        <p>Start with what each choice would feel like for the planning team. Technical ownership details for Chad and LSS IT are available below.</p>
        <nav className="scenario-audience-links" aria-label="Page sections"><a href="#planning-options">For Rachel &amp; the planning team</a><a href="#technical-details">For Chad &amp; LSS IT</a></nav>
      </section>
      <section className="scenario-card-grid" id="planning-options" aria-label="Planner delivery options">
        {options.map((option) => (
          <article className={`scenario-card option-${option.letter.toLowerCase()}`} key={option.letter}>
            {"recommended" in option && option.recommended ? <span className="scenario-recommendation">Best balance</span> : null}
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
      <section className="scenario-commitment capability-fit" aria-labelledby="capability-heading">
        <div className="scenario-commitment-heading">
          <p className="eyebrow">FUNCTIONALITY FIT</p>
          <h2 id="capability-heading">What is retained—and what changes</h2>
          <p>Option A is the experience baseline. “Adapted” means the task remains possible, but the interaction is less direct.</p>
        </div>
        <div className="scenario-comparison-scroll">
          <table className="scenario-comparison capability-table">
            <thead><tr><th scope="col">Capability</th>{options.map((option) => <th scope="col" key={option.letter}>{option.letter} · {option.title}</th>)}</tr></thead>
            <tbody>
              {capabilities.map((capability) => (
                <tr key={capability.feature}>
                  <th scope="row">{capability.feature}</th>
                  {(["a", "b", "c", "d"] as const).map((key) => (
                    <td key={key}><strong className={`fit-${capability[key][0].toLowerCase()}`}>{capability[key][0]}</strong><span>{capability[key][1]}</span></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <details className="scenario-technical" id="technical-details">
        <summary><span><small>FOR CHAD &amp; LSS IT</small><strong>Open technical ownership and maintenance details</strong></span><span aria-hidden="true">＋</span></summary>
        <p className="scenario-technical-note"><strong>Terminology:</strong> PCF means Power Apps Component Framework—the Microsoft extension used for Option D’s custom calendar. Coding agents can accelerate changes to it, but LSS still needs someone to review, test, and deploy those changes.</p>
        <section className="scenario-commitment" aria-labelledby="commitment-heading">
          <div className="scenario-commitment-heading">
            <p className="eyebrow">LONG-TERM COMMITMENT</p>
            <h2 id="commitment-heading">What LSS is signing up to own</h2>
            <p>Relative estimates for production—not vendor quotes. Timing depends on LSS security, access, and deployment review.</p>
          </div>
          <div className="scenario-comparison-scroll">
            <table className="scenario-comparison">
              <thead><tr><th scope="col">Decision</th>{options.map((option) => <th scope="col" key={option.letter}>{option.letter} · {option.title}</th>)}</tr></thead>
              <tbody>
                <tr><th scope="row">Ongoing LSS effort</th>{options.map((option) => <td key={option.letter}>{option.effort}</td>)}</tr>
                <tr><th scope="row">Time to production</th>{options.map((option) => <td key={option.letter}>{option.timeline}</td>)}</tr>
                <tr><th scope="row">Who gets called</th>{options.map((option) => <td key={option.letter}>{option.support}</td>)}</tr>
                <tr className="agent-row"><th scope="row">Where coding agents help</th>{options.map((option) => <td key={option.letter}>{option.agentRole}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </section>
      </details>
      <p className="scenario-scope-note"><strong>Recommended boundary:</strong> Navira provides the prototype, source, and handoff documentation. LSS owns production deployment, Microsoft permissions, and ongoing maintenance.</p>
    </main>
  );
}
