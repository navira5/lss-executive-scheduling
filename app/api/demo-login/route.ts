import { NextResponse } from "next/server";

import {
  createDemoSessionToken,
  demoAuthEnabled,
  demoSessionCookie,
  safeReturnTo,
  verifyDemoCredentials,
} from "@/app/demo-auth";

export async function POST(request: Request): Promise<Response> {
  if (!demoAuthEnabled()) return NextResponse.redirect(new URL("/", request.url), 303);
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const accessCode = String(form.get("access_code") ?? "");
  const returnTo = safeReturnTo(String(form.get("return_to") ?? "/"));

  if (!await verifyDemoCredentials(username, accessCode)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const failed = new URL("/demo-login", request.url);
    failed.searchParams.set("error", "1");
    failed.searchParams.set("return_to", returnTo);
    return NextResponse.redirect(failed, 303);
  }

  const token = await createDemoSessionToken(username);
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(demoSessionCookie.name, token, demoSessionCookie.options);
  return response;
}
