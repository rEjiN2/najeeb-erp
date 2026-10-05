import "server-only";

import { cache } from "react";

import { apiGet } from "@/lib/api";

import type { AuthUser, Session } from "./types";

/**
 * Server-side session read: asks the backend who the request's cookies
 * belong to. Wrapped in `cache` so the root layout, protected layout and page
 * share one GET /auth/me per request instead of one each.
 */
export const getServerSession = cache(async (): Promise<Session | null> => {
  const result = await apiGet<AuthUser>("/auth/me");
  return result.ok ? { user: result.data } : null;
});
