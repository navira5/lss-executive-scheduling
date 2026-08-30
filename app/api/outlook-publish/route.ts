import { requireDemoApiSession } from "@/app/demo-auth";

export async function POST(): Promise<Response> {
  const unauthorized = await requireDemoApiSession();
  if (unauthorized) return unauthorized;
  return Response.json({
    error: "Direct Outlook publishing has been retired. Review creates, updates, and deletions through Outlook Change Review.",
  }, { status: 410 });
}
