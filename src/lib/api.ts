import "server-only";

import { cookies } from "next/headers";

import { ACCESS_COOKIE_NAME as BACKEND_ACCESS_COOKIE } from "@/features/auth/constants";

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

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

function getBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "API_BASE_URL is not set. Add it to .env.local (see .env.example).",
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

/** Backend error envelope: `message` is a string, or a list for validation errors. */
async function readErrorMessages(response: Response): Promise<string[]> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message;
    return body.message ? [body.message] : [];
  } catch {
    return [];
  }
}

function reasonFor(status: number): ApiFailureReason {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  return "error";
}

/**
 * Server-side request against the backend. Forwards the caller's backend
 * access cookie (the backend authenticates by cookie, not bearer header) and
 * never throws for HTTP/network failures — callers render a state per
 * `reason` instead of falling back to placeholder data.
 */
async function apiRequest<T>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const store = await cookies();
  const accessToken = store.get(BACKEND_ACCESS_COOKIE)?.value;

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken
          ? { Cookie: `${BACKEND_ACCESS_COOKIE}=${accessToken}` }
          : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "unavailable", messages: [] };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: reasonFor(response.status),
      status: response.status,
      messages: await readErrorMessages(response),
    };
  }

  return { ok: true, data: (await response.json()) as T };
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>("GET", path);
}

export function apiSend<T>(
  method: Exclude<ApiMethod, "GET">,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  return apiRequest<T>(method, path, body);
}
