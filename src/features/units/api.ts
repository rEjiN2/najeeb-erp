import "server-only";

import { hasPermission } from "@/features/auth/session";
import { PERMISSIONS } from "@/features/auth/permissions";
import { apiGet, type ApiResult } from "@/lib/api";

import type { Unit } from "./types";

/** Every unit, by name (GET /units). */
export async function getUnits(): Promise<ApiResult<Unit[]>> {
  const result =
    await apiGet<{ _id: string; name: string; symbol: string }[]>("/units");
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.map(({ _id, name, symbol }) => ({
      id: String(_id),
      name,
      symbol,
    })),
  };
}

export function canManageUnits(): Promise<boolean> {
  return hasPermission(PERMISSIONS.UNITS_MANAGE);
}
