import { NextResponse } from "next/server";

import { demoSessionCookie } from "@/app/demo-auth";

export async function GET(request: Request): Promise<Response> {
  const response = NextResponse.redirect(new URL("/demo-login", request.url), 303);
  response.cookies.set(demoSessionCookie.name, "", {
    ...demoSessionCookie.options,
    maxAge: 0,
  });
  return response;
}
