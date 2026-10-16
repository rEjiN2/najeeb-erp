import "server-only";

import { hasPermission } from "@/features/auth/session";
import { PERMISSIONS } from "@/features/auth/permissions";
import { apiGet, type ApiResult } from "@/lib/api";

import type { Role } from "./types";

/** Every role, sorted by name (GET /roles — not paginated). */
export function getRoles(): Promise<ApiResult<Role[]>> {
  return apiGet<Role[]>("/roles");
}

/** Every permission a role can hold (GET /roles/permissions). */
export function getPermissionCatalog(): Promise<ApiResult<string[]>> {
  return apiGet<string[]>("/roles/permissions");
}

export function canManageRoles(): Promise<boolean> {
  return hasPermission(PERMISSIONS.ROLES_MANAGE);
}
