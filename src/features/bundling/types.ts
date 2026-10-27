import type { DatePreset } from "@/features/vouchers/filters";
import type { UserRef, VoucherStatus } from "@/features/vouchers/types";

import type { BundlingMode } from "./constants";

// The backend's bundling module (bundling.service.ts, dto/bundling.dto.ts).
// Costs are absent without products:view-cost.

/** GET /bundlings item. */
export interface BundlingRow {
  id: string;
  voucherNo: string;
  date: string;
  location: { id: string; name: string | null };
  mode: BundlingMode;
  bundleProduct: { id: string; code: string | null; name: string | null };
  qty: number;
  costPerUnit?: number;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  commentCount: number;
}

export interface BundlingPage {
  items: BundlingRow[];
  page: number;
  pageSize: number;
  summary: { count: number };
}

export interface BundlingFilters {
  range: DatePreset;
  from: string;
  to: string;
  status: "all" | "posted" | "cancelled";
  mode: "all" | BundlingMode;
  locationId: string;
  bundleProductId: string;
  q: string;
  page: number;
}

/** GET /bundlings/:id */
export interface BundlingDetail {
  id: string;
  voucherNo: string;
  date: string;
  location: { id: string; name: string | null };
  mode: BundlingMode;
  bundleProduct: { id: string; code: string | null; name: string | null };
  qty: number;
  updateBundlePurchasePrice: boolean;
  remarks: string | null;
  recipeSnapshot: {
    version: number;
    extraCostPerUnit?: number;
    components: {
      productId: string;
      productCode: string | null;
      productName: string | null;
      qty: number;
      totalQty: number;
      unitCost?: number;
    }[];
  };
  costPerUnit?: number;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  cancelledBy: UserRef | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

/** A bundle product that can be packed: it has a recipe. */
export interface BundleOption {
  id: string;
  code: string;
  name: string;
  unit: string | null;
}

/** One part of a bundle, as the new-bundling form shows it. */
export interface PreviewPart {
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  requiredPerUnit: number;
  requiredTotal: number;
  available: number;
  short: number;
  /** Purchase price; only with products:view-cost. */
  unitCost?: number;
}

/** GET /bundles/:id/availability plus the recipe's extra cost and part costs. */
export interface BundlePreview {
  parts: PreviewPart[];
  maxBundles: number;
  /** Only with products:view-cost. */
  extraCostPerUnit?: number;
}

/** What the new-bundling form submits. */
export interface BundlingInput {
  date: string;
  locationId: string;
  mode: BundlingMode;
  bundleProductId: string;
  qty: number;
  updateBundlePurchasePrice: boolean;
  remarks: string;
}

/** GET /products/:id/recipe, with each part's unit and (with cost) price. */
export interface RecipeComponent {
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  qty: number;
  unitCost?: number;
}

export interface Recipe {
  extraCostPerUnit: number;
  components: RecipeComponent[];
}
