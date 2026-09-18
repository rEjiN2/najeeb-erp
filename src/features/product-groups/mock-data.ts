import type { ProductGroup } from "./types";

// Reflects the business: dates sold loose by variety, plus bundling/gift
// packs as their own first-class taxonomy branch (see CLAUDE.md).
export const MOCK_PRODUCT_GROUPS: ProductGroup[] = [
  { id: "pg-dates", code: "PG-DATES", name: "Dates", parentId: null },
  {
    id: "pg-ajwa",
    code: "PG-AJWA",
    name: "Ajwa Dates",
    parentId: "pg-dates",
  },
  {
    id: "pg-medjool",
    code: "PG-MEDJ",
    name: "Medjool Dates",
    parentId: "pg-dates",
  },
  {
    id: "pg-sukkari",
    code: "PG-SUKK",
    name: "Sukkari Dates",
    parentId: "pg-dates",
  },
  {
    id: "pg-bundles",
    code: "PG-BNDL",
    name: "Gift Packs & Bundles",
    parentId: null,
  },
  {
    id: "pg-hampers",
    code: "PG-HAMP",
    name: "Premium Hampers",
    parentId: "pg-bundles",
  },
  {
    id: "pg-festive",
    code: "PG-FEST",
    name: "Festive Boxes",
    parentId: "pg-bundles",
  },
  {
    id: "pg-packaging",
    code: "PG-PACK",
    name: "Packaging Materials",
    parentId: null,
  },
];
