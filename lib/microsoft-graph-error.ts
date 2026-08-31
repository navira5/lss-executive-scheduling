interface MicrosoftGraphErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export type MicrosoftGraphOperation = "read" | "write";

export class MicrosoftGraphRequestError extends Error {
  readonly providerStatus: number;
  readonly providerCode?: string;
  readonly requestId?: string;
  readonly retryable: boolean;

  constructor({
    message,
    providerStatus,
    providerCode,
    requestId,
    retryable,
  }: {
    message: string;
    providerStatus: number;
    providerCode?: string;
    requestId?: string;
    retryable: boolean;
  }) {
    super(message);
    this.name = "MicrosoftGraphRequestError";
    this.providerStatus = providerStatus;
    this.providerCode = providerCode;
    this.requestId = requestId;
    this.retryable = retryable;
  }
}

function userMessage(status: number, operation: MicrosoftGraphOperation): string {
  if (status === 401 || status === 403) {
    return "The demo Outlook connection is not authorized. Your planner work is safe, and no unapproved changes were made.";
  }
  if (status === 404) {
    return "The dedicated demo Outlook calendar could not be found. Your planner work is safe, and no unapproved changes were made.";
  }
  if (status === 429 || status >= 500) {
    return operation === "read"
      ? "Microsoft Outlook is temporarily unavailable for the demo mailbox. Your planner work is safe, and no Outlook changes were made. Try again after Outlook opens normally."
      : "Microsoft Outlook returned a temporary error while applying this change. Review the demo calendar before retrying because another approved change may already have succeeded.";
  }
  return operation === "read"
    ? "Microsoft Outlook could not load the demo calendar. Your planner work is safe, and no Outlook changes were made."
    : "Microsoft Outlook could not apply this approved calendar change.";
}

export async function microsoftGraphRequestError(
  response: Response,
  operation: MicrosoftGraphOperation,
): Promise<MicrosoftGraphRequestError> {
  const payload = await response.json().catch(() => null) as MicrosoftGraphErrorBody | null;
  const requestId = response.headers.get("request-id") ?? response.headers.get("client-request-id") ?? undefined;
  return new MicrosoftGraphRequestError({
    message: userMessage(response.status, operation),
    providerStatus: response.status,
    providerCode: payload?.error?.code,
    requestId,
    retryable: response.status === 429 || response.status >= 500,
  });
}

export function microsoftGraphFailureResponse(
  error: unknown,
  fallback: string,
): { status: number; body: Record<string, unknown> } {
  if (!(error instanceof MicrosoftGraphRequestError)) {
    return {
      status: 502,
      body: { error: error instanceof Error ? error.message : fallback },
    };
  }
  return {
    status: error.retryable ? 503 : 502,
    body: {
      error: error.message,
      provider: "Microsoft Graph",
      providerStatus: error.providerStatus,
      ...(error.providerCode ? { providerCode: error.providerCode } : {}),
      ...(error.requestId ? { requestId: error.requestId } : {}),
      retryable: error.retryable,
    },
  };
}

export function microsoftGraphFailureLog(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof MicrosoftGraphRequestError)) return null;
  return {
    provider: "Microsoft Graph",
    providerStatus: error.providerStatus,
    providerCode: error.providerCode,
    requestId: error.requestId,
    retryable: error.retryable,
  };
}
