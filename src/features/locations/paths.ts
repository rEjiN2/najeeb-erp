import { getAncestorIds } from "@/lib/tree";

import type { Location } from "./types";

const getParentId = (location: Location) => location.parentId;

/**
 * id → full path, root first, ending in the location itself:
 * "Main Branch > Main Warehouse > Van 1". Tells apart locations with similar
 * names wherever one is shown or picked.
 */
export function getLocationPaths(locations: Location[]): Map<string, string> {
  const byId = new Map(locations.map((location) => [location.id, location]));

  return new Map(
    locations.map((location) => [
      location.id,
      [
        ...[...getAncestorIds(locations, getParentId, location.id)]
          .reverse()
          .map((id) => byId.get(id)?.name),
        location.name,
      ]
        .filter(Boolean)
        .join(" > "),
    ]),
  );
}
