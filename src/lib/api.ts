import "server-only";

import { cookies } from "next/headers";

import { ACCESS_COOKIE_NAME as BACKEND_ACCESS_COOKIE } from "@/features/auth/constants";

export type ApiFailureReason = "unauthorized" | "unavailable" | "error";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ApiFailureReason; status?: number };

function getBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "API_BASE_URL is not set. Add it to .env.local (see .env.example).",
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

/**
 * Server-side GET against the backend. Forwards the caller's backend access
 * cookie (the backend authenticates by cookie, not bearer header) and never
 * throws for HTTP/network failures — callers render a state per `reason`
 * instead of falling back to placeholder numbers.
 */
export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const store = await cookies();
  const accessToken = store.get(BACKEND_ACCESS_COOKIE)?.value;

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      headers: {
        Accept: "application/json",
        ...(accessToken
          ? { Cookie: `${BACKEND_ACCESS_COOKIE}=${accessToken}` }
          : {}),
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (response.status === 401) {
    return { ok: false, reason: "unauthorized", status: 401 };
  }
  if (!response.ok) {
    return { ok: false, reason: "error", status: response.status };
  }

  return { ok: true, data: (await response.json()) as T };
}
