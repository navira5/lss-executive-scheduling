import type { Metadata } from "next";

import { ScenarioSwitcher } from "@/app/components/ScenarioSwitcher";
import { requireDemoSession } from "@/app/demo-auth";
import { ScenarioAudienceToggle } from "@/app/scenarios/ScenarioAudienceToggle";

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
    feature: "Plan by layer and maintain rules",
    a: ["Retained", "Plan one layer at a time, edit its rules, and generate meetings."],
    b: ["Retained", "Same workflow; confirmed rules update the shared LSS source."],
    c: ["Retained", "Standard screens and forms maintain rules and create meetings."],
    d: ["Retained", "Standard rule forms drive the custom calendar."],
  },
  {
    feature: "Manage meetings and closed dates",
    a: ["Retained", "Add, edit, cancel, or delete meetings and mark LSS closures."],
    b: ["Retained", "Same actions, with Outlook changes held for review."],
    c: ["Adapted", "The same actions use standard forms instead of the calendar grid."],
    d: ["Retained", "Direct calendar actions with an approval step."],
  },
  {
    feature: "See and rearrange the year",
    a: ["Retained", "See all 12 months and drag meetings to new dates."],
    b: ["Retained", "Same year view and drag-and-drop experience."],
    c: ["Adapted", "Use a month view plus annual list; change dates in a form."],
    d: ["Retained", "The custom calendar keeps the full-year view and drag-and-drop."],
  },
  {
    feature: "Catch scheduling problems",
    a: ["Retained", "Immediate on placement and rule changes."],
    b: ["Retained", "Immediate, with Outlook context."],
    c: ["Adapted", "Checks run when a rule or meeting form is saved."],
    d: ["Retained", "Immediate warnings in the custom calendar."],
  },
  {
    feature: "Use Outlook safely",
    a: ["Manual", "Bring calendar files in and out manually."],
    b: ["Retained", "See Outlook context and publish only after human approval."],
    c: ["Retained", "Microsoft connections can read events and require approval before publishing."],
    d: ["Retained", "Same reviewed Outlook workflow inside Microsoft."],
  },
  {
    feature: "Export and hand off the plan",
    a: ["Retained", "Download PDF, ICS, and rules CSV files."],
    b: ["Retained", "Files plus reviewed direct publishing."],
    c: ["Adapted", "A Microsoft workflow generates the files."],
    d: ["Adapted", "A Microsoft workflow handles the same outputs."],
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
        <ScenarioAudienceToggle />
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
        <p className="future-capability-note"><strong>Future scheduling helper:</strong> Felise could enter a meeting request and ask the system to suggest the best dates. That recommendation logic would be custom work in every option, so it is not a meaningful difference between A, B, C, and D.</p>
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
