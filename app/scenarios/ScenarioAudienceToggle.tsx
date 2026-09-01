"use client";

import { useState } from "react";

type Audience = "planning" | "technical";

export function ScenarioAudienceToggle() {
  const [audience, setAudience] = useState<Audience>("planning");

  function showAudience(nextAudience: Audience) {
    setAudience(nextAudience);

    if (nextAudience === "technical") {
      const technicalDetails = document.querySelector<HTMLDetailsElement>("#technical-details");
      if (technicalDetails) technicalDetails.open = true;
      window.requestAnimationFrame(() => technicalDetails?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }

    const technicalDetails = document.querySelector<HTMLDetailsElement>("#technical-details");
    if (technicalDetails) technicalDetails.open = false;
    window.requestAnimationFrame(() => document.querySelector("#planning-options")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <nav className="scenario-audience-links" aria-label="Choose information for planning or IT">
      <button className={audience === "planning" ? "active" : ""} type="button" aria-pressed={audience === "planning"} onClick={() => showAudience("planning")}>For Rachel &amp; the planning team</button>
      <button className={audience === "technical" ? "active" : ""} type="button" aria-pressed={audience === "technical"} onClick={() => showAudience("technical")}>For Chad &amp; LSS IT</button>
    </nav>
  );
}
