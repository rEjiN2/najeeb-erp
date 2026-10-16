import "server-only";

import { cookies } from "next/headers";

import { ACCESS_COOKIE_NAME as BACKEND_ACCESS_COOKIE } from "@/features/auth/constants";

import { readErrorMessages, reasonFor, type ApiResult } from "./api-types";

export type { ApiFailure, ApiFailureReason, ApiResult } from "./api-types";

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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

/**
 * Raw GET against the backend with the caller's cookie, for responses that
 * aren't JSON (PDFs, files) and are streamed straight through. Throws only
 * when the backend can't be reached.
 */
export async function apiFetchRaw(path: string): Promise<Response> {
  const store = await cookies();
  const accessToken = store.get(BACKEND_ACCESS_COOKIE)?.value;
  return fetch(`${getBaseUrl()}${path}`, {
    headers: accessToken
      ? { Cookie: `${BACKEND_ACCESS_COOKIE}=${accessToken}` }
      : {},
    cache: "no-store",
  });
}
