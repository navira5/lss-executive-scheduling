import { redirect } from "next/navigation";

import { demoAuthEnabled, getDemoSession, safeReturnTo } from "@/app/demo-auth";

export const dynamic = "force-dynamic";

export default async function DemoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>;
}) {
  if (!demoAuthEnabled()) redirect("/");
  const session = await getDemoSession();
  if (session) redirect("/");
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return_to ?? "/");

  return (
    <main className="demo-login-shell">
      <section className="demo-login-card" aria-labelledby="demo-login-title">
        <div className="brand-mark" aria-hidden="true">LSS</div>
        <p className="eyebrow">Private prototype</p>
        <h1 id="demo-login-title">2027 Calendar Planning</h1>
        <p>Use the temporary testing credentials supplied by Navira. This private workspace includes standalone, Microsoft-connected, and Power Apps comparison views.</p>
        {params.error ? <div className="demo-login-error" role="alert">The username or access code was not recognized.</div> : null}
        <form action="/api/demo-login" method="post">
          <input type="hidden" name="return_to" value={returnTo} />
          <label>
            <span>Username</span>
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            <span>Access code</span>
            <input name="access_code" type="password" autoComplete="current-password" required />
          </label>
          <button className="button primary" type="submit">Enter planning workspace</button>
        </form>
        <small>Planning changes are saved only in this browser. Only the connected option can reach the isolated Microsoft trial tenant, and Outlook changes always require review.</small>
      </section>
    </main>
  );
}
