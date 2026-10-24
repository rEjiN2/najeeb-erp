import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";
import { flattenTreeNodes } from "@/lib/tree";

import {
  STOCK_LOCATION_TYPES,
  type Location,
  type LocationRules,
  type LocationTreeNode,
  type StockLocation,
} from "./types";

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

/** Active warehouses, stores and vans, by name: the stock location pickers. */
export async function getStockLocations(): Promise<ApiResult<StockLocation[]>> {
  const result = await getLocations();
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data
      .filter(
        (location) =>
          location.status === "active" &&
          STOCK_LOCATION_TYPES.includes(location.type),
      )
      .map(({ id, code, name, type }) => ({ id, code, name, type }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Parent rules + depth limit the form filters the parent picker with. */
export function getLocationRules(): Promise<ApiResult<LocationRules>> {
  return apiGet<LocationRules>("/locations/rules");
}
