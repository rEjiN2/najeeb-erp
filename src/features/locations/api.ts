import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";
import { flattenTreeNodes } from "@/lib/tree";

import type { Location, LocationRules, LocationTreeNode } from "./types";

/** Whole location forest from GET /locations/tree, flattened to the
 * id/parentId list the master table and parent picker work from. */
export async function getLocations(): Promise<ApiResult<Location[]>> {
  const result = await apiGet<LocationTreeNode[]>("/locations/tree");
  if (!result.ok) return result;

  return {
    ok: true,
    data: flattenTreeNodes(
      result.data,
      ({ id, code, name, type, status, parentId }) => ({
        id,
        code,
        name,
        type,
        status,
        parentId,
      }),
    ),
  };
}

/** Parent rules + depth limit the form filters the parent picker with. */
export function getLocationRules(): Promise<ApiResult<LocationRules>> {
  return apiGet<LocationRules>("/locations/rules");
}
