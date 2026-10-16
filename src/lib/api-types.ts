export type ApiFailureReason =
  "unauthorized" | "forbidden" | "unavailable" | "error";

export interface ApiFailure {
  ok: false;
  reason: ApiFailureReason;
  status?: number;
  /** Messages from the backend's error envelope; empty when it sent none. */
  messages: string[];
  /** Things the user must confirm before retrying (e.g. a payment taking
   * cash below zero) — present only when the backend sent a list. */
  warnings?: unknown[];
}

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

/** Backend error envelope: `message` is a string, or a list for validation
 * errors; `warnings` rides along on a 409 that can be acknowledged. */
export async function readErrorBody(
  response: Response,
): Promise<{ messages: string[]; warnings?: unknown[] }> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      warnings?: unknown;
    };
    const messages = Array.isArray(body.message)
      ? body.message
      : body.message
        ? [body.message]
        : [];
    return Array.isArray(body.warnings)
      ? { messages, warnings: body.warnings }
      : { messages };
  } catch {
    return { messages: [] };
  }
}

export async function readErrorMessages(response: Response): Promise<string[]> {
  return (await readErrorBody(response)).messages;
}

export function reasonFor(status: number): ApiFailureReason {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  return "error";
}

/** One user-facing sentence for a failed request — never a raw 5xx body. */
export function describeFailure(failure: ApiFailure): string {
  switch (failure.reason) {
    case "unauthorized":
      return "Your session has expired. Sign in again to continue.";
    case "forbidden":
      return "You don't have permission to do this.";
    case "unavailable":
      return "Can't reach the server. Check your connection and try again.";
    case "error":
      if (failure.status && failure.status >= 500) {
        return `The server hit an error (HTTP ${failure.status}). Try again in a moment.`;
      }
      return (
        failure.messages.join(" ") ||
        `The request failed${failure.status ? ` (HTTP ${failure.status})` : ""}.`
      );
  }
}
