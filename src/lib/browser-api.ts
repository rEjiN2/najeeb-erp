import { BACKEND_PROXY_PATH } from "@/features/auth/constants";

import { readErrorMessages, reasonFor, type ApiResult } from "./api-types";

/**
 * Sends the user to sign in again, then back to where they were. A full page
 * load on purpose: the session is gone, so no client state is worth keeping.
 */
export function redirectToLogin(): void {
  const from = `${window.location.pathname}${window.location.search}`;
  const url = new URL("/login", window.location.origin);
  url.searchParams.set("from", from);
  window.location.assign(url.href);
}

/**
 * Client-side request through the same-origin backend proxy (next.config.ts),
 * so the httpOnly session cookies ride along. Like the server's apiGet, it
 * never throws: callers render a state per `reason`. A 401 also starts the
 * sign-in redirect.
 */
export async function browserApi<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_PROXY_PATH}${path}`, {
      method: init.method ?? "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return { ok: false, reason: "unavailable", messages: [] };
  }

  if (!response.ok) {
    const failure = {
      ok: false as const,
      reason: reasonFor(response.status),
      status: response.status,
      messages: await readErrorMessages(response),
    };
    if (failure.reason === "unauthorized") redirectToLogin();
    return failure;
  }

  return { ok: true, data: (await response.json()) as T };
}

/** Multipart POST through the proxy (e.g. POST /files/upload). Same contract as browserApi. */
export async function browserUpload<T>(
  path: string,
  form: FormData,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_PROXY_PATH}${path}`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      // No Content-Type: the browser sets the multipart boundary itself.
      body: form,
    });
  } catch {
    return { ok: false, reason: "unavailable", messages: [] };
  }

  if (!response.ok) {
    const failure = {
      ok: false as const,
      reason: reasonFor(response.status),
      status: response.status,
      messages: await readErrorMessages(response),
    };
    if (failure.reason === "unauthorized") redirectToLogin();
    return failure;
  }

  return { ok: true, data: (await response.json()) as T };
}
