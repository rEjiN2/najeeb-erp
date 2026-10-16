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

/**
 * Whether the signed-in user holds `permission`. Only decides what the UI
 * offers — the backend enforces the same permission on every request.
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getServerSession();
  return session?.user.permissions.includes(permission) ?? false;
}

/** Whether the signed-in user's role sees only their own vouchers. */
export async function isOwnScope(): Promise<boolean> {
  const session = await getServerSession();
  return session?.user.dataScope === "own";
}
