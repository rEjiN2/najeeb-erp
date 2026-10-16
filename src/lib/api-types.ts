export type ApiFailureReason =
  "unauthorized" | "forbidden" | "unavailable" | "error";

export interface ApiFailure {
  ok: false;
  reason: ApiFailureReason;
  status?: number;
  /** Messages from the backend's error envelope; empty when it sent none. */
  messages: string[];
}

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

/** Backend error envelope: `message` is a string, or a list for validation errors. */
export async function readErrorMessages(response: Response): Promise<string[]> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message;
    return body.message ? [body.message] : [];
  } catch {
    return [];
  }
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
