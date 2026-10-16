import "server-only";

import { hasPermission } from "@/features/auth/session";
import { PERMISSIONS } from "@/features/auth/permissions";
import { apiGet, type ApiResult } from "@/lib/api";

import { USERS_PAGE_SIZE } from "./constants";
import {
  USER_STATUSES,
  type CashAccountRef,
  type RoleLookupItem,
  type UserFilters,
  type UserPage,
} from "./types";

export interface UserLookupItem {
  id: string;
  name: string;
}

/** Every user, inactive ones included (GET /users/lookup). */
export function getUsers(): Promise<ApiResult<UserLookupItem[]>> {
  return apiGet<UserLookupItem[]>("/users/lookup");
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** URL → filters; anything unrecognised falls back to the default. */
export function parseUserFilters(params: SearchParams): UserFilters {
  const status = first(params.status);
  const roleId = first(params.roleId);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    status: (USER_STATUSES as readonly string[]).includes(status)
      ? (status as UserFilters["status"])
      : "all",
    roleId: /^[a-f0-9]{24}$/i.test(roleId) ? roleId : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function getUserPage(
  filters: UserFilters,
): Promise<ApiResult<UserPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(USERS_PAGE_SIZE),
  });
  if (filters.q) query.set("q", filters.q);
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.roleId) query.set("roleId", filters.roleId);
  return apiGet<UserPage>(`/users?${query}`);
}

/** Roles for the user form (GET /roles/lookup, users:manage). */
export function getRoleLookup(): Promise<ApiResult<RoleLookupItem[]>> {
  return apiGet<RoleLookupItem[]>("/roles/lookup");
}

/** Active company cash and wallet accounts a scoped user may be allowed —
 * the backend's ALLOWED_CASH_ACCOUNT_TYPES. */
export function getAssignableCashAccounts(): Promise<
  ApiResult<CashAccountRef[]>
> {
  return apiGet<CashAccountRef[]>(
    "/accounts/lookup?scope=company&types=cash,wallet&limit=100",
  );
}

export function canManageUsers(): Promise<boolean> {
  return hasPermission(PERMISSIONS.USERS_MANAGE);
}
