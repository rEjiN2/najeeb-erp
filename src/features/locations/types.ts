import type { MasterStatus } from "@/components/master/status-badge";

export const LOCATION_TYPES = ["Branch", "Warehouse", "Store", "Van"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

/**
 * Which types a location of a given type may sit under. Branch has none —
 * it's always top-level. A Van is explicitly allowed under either a
 * Warehouse or a Branch directly.
 */
export const ALLOWED_PARENT_TYPES: Record<LocationType, LocationType[]> = {
  Branch: [],
  Warehouse: ["Branch"],
  Store: ["Warehouse"],
  Van: ["Warehouse", "Branch"],
};

export interface Location {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  parentId: string | null;
  status: MasterStatus;
}
