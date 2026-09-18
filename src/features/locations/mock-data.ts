import type { Location } from "./types";

// Matches today's real shape from the spec: one Branch, one Warehouse,
// one Store, two Vans — plus a second Branch with nothing under it yet,
// to show the tree isn't hard-coded to a single root.
export const MOCK_LOCATIONS: Location[] = [
  {
    id: "loc-main-branch",
    code: "BR-001",
    name: "Main Branch",
    type: "Branch",
    parentId: null,
    status: "Active",
  },
  {
    id: "loc-main-warehouse",
    code: "WH-001",
    name: "Main Warehouse",
    type: "Warehouse",
    parentId: "loc-main-branch",
    status: "Active",
  },
  {
    id: "loc-main-store",
    code: "ST-001",
    name: "Main Store",
    type: "Store",
    parentId: "loc-main-warehouse",
    status: "Active",
  },
  {
    id: "loc-van-1",
    code: "VN-001",
    name: "Delivery Van 1",
    type: "Van",
    parentId: "loc-main-warehouse",
    status: "Active",
  },
  {
    id: "loc-van-2",
    code: "VN-002",
    name: "Delivery Van 2",
    type: "Van",
    parentId: "loc-main-warehouse",
    status: "Active",
  },
  {
    id: "loc-north-branch",
    code: "BR-002",
    name: "North Branch",
    type: "Branch",
    parentId: null,
    status: "Inactive",
  },
];
