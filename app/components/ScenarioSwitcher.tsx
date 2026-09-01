const OPTIONS = [
  { id: "standalone", label: "A · Standalone", href: "/standalone" },
  { id: "integrated", label: "B · Microsoft-connected", href: "/integrated" },
  { id: "native-power-apps", label: "C · Native Power Apps", href: "/native-power-apps" },
  { id: "power-apps", label: "D · Power Apps + PCF", href: "/power-apps" },
] as const;

export function ScenarioSwitcher({
  current,
}: {
  current: "standalone" | "integrated" | "native-power-apps" | "power-apps" | "overview";
}) {
  return (
    <nav className="scenario-switcher" aria-label="Planner delivery options">
      <a className="scenario-switcher-home" href="/scenarios">
        <span className="scenario-mini-mark" aria-hidden="true">LSS</span>
        <span><strong>Delivery options</strong><small>Compare four ways to run the planner</small></span>
      </a>
      <div className="scenario-switcher-links">
        {OPTIONS.map((option) => (
          <a
            key={option.id}
            href={option.href}
            className={current === option.id ? "active" : ""}
            aria-current={current === option.id ? "page" : undefined}
          >
            {option.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
