import type { MasterStatus } from "@/components/master/status-badge";

// Mirrors the backend's location.schema.ts enums and LocationTreeItem
// (location.service.ts). Values are the wire values — lowercase.

export const LOCATION_TYPES = ["branch", "warehouse", "store", "van"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  branch: "Branch",
  warehouse: "Warehouse",
  store: "Store",
  van: "Van",
};

export const LOCATION_STATUSES = ["active", "inactive"] as const;
export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export const LOCATION_STATUS_LABELS: Record<LocationStatus, MasterStatus> = {
  active: "Active",
  inactive: "Inactive",
};

/**
 * GET /locations/rules — the backend's single source for the hierarchy.
 * `allowedParentTypes[type]` lists the types a location may sit under; a
 * `null` entry means it may also be top-level (no `null` → parent required).
 * Never hardcode these here.
 */
export interface LocationRules {
  allowedParentTypes: Record<LocationType, (LocationType | null)[]>;
  /** Max levels in one chain, a top-level location being level 1. */
  maxLevels: number;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  status: LocationStatus;
  parentId: string | null;
  // The tree response also carries a cached `depth`, but records created
  // before it existed omit it — depth is derived from parentId instead.
}

/** GET /locations/tree node. */
export type LocationTreeNode = Location & { children: LocationTreeNode[] };

/**
 * Body for POST /locations and PATCH /locations/:id (CreateLocationDto).
 * No `code`: the backend generates it per type (BR-/WH-/ST-/VAN-) and rejects
 * a payload that includes one.
 */
export type LocationInput = Omit<Location, "id" | "code">;

/** The saved Mongoose document POST/PATCH /locations respond with — only the
 * fields the UI reads. */
export interface SavedLocation {
  _id: string;
  code: string;
  name: string;
  type: LocationType;
}
