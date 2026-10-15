import "server-only";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import type { ApiResult } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";

interface RunMutationOptions<T> {
  /** Page to come back to after signing in again on a 401. */
  returnTo: string;
  /** Shown on a 403 — names what the user isn't allowed to do. */
  forbiddenMessage: string;
  /** Builds the success toast from the backend's response body. */
  successMessage?: (data: T) => string;
}

/**
 * Turns a backend write into a MutationResult for a Server Action: refreshes
 * the client router on success (so server-rendered lists re-fetch), sends the
 * user to /login on 401, and keeps the backend's own validation messages.
 */
export async function runMutation<T>(
  request: Promise<ApiResult<T>>,
  { returnTo, forbiddenMessage, successMessage }: RunMutationOptions<T>,
): Promise<MutationResult> {
  const result = await request;

  if (result.ok) {
    refresh();
    return { ok: true, message: successMessage?.(result.data) };
  }

  switch (result.reason) {
    case "unauthorized":
      redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
    case "forbidden":
      return { ok: false, messages: [forbiddenMessage], status: 403 };
    case "unavailable":
      return {
        ok: false,
        messages: [
          "Can't reach the server. Check your connection and try again.",
        ],
      };
    case "error":
      // The record was removed elsewhere — refresh so the stale row goes away.
      if (result.status === 404) refresh();
      // 5xx bodies can carry raw database errors; never show those.
      if (result.status && result.status >= 500) {
        return {
          ok: false,
          messages: [
            `The server hit an error (HTTP ${result.status}). Try again in a moment.`,
          ],
          status: result.status,
        };
      }
      return {
        ok: false,
        messages:
          result.messages.length > 0
            ? result.messages
            : [`The server rejected this change (HTTP ${result.status}).`],
        status: result.status,
      };
  }
}
