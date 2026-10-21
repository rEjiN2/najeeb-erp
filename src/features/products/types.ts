import type { MasterStatus } from "@/components/master/status-badge";

// Mirrors ProductView in the backend's product.service.ts and the enums in
// schemas/product.schema.ts. purchasePrice is absent without
// products:view-cost: the backend strips it.

export const PRODUCT_TYPES = ["stock", "non_stock", "bundle"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  stock: "Stock item",
  non_stock: "Non-stock / service",
  bundle: "Bundle",
};

export const PRODUCT_STATUSES = ["active", "inactive"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, MasterStatus> = {
  active: "Active",
  inactive: "Inactive",
};

export interface Product {
  id: string;
  code: string;
  name: string;
  productGroupId: string;
  productGroup: { id: string; code: string; name: string } | null;
  type: ProductType;
  unitId: string;
  unit: { id: string; name: string; symbol: string } | null;
  barcode: string | null;
  salePrice: number;
  purchasePrice?: number;
  vatRate: number;
  minStock: number | null;
  reorderLevel: number | null;
  maxStock: number | null;
  status: ProductStatus;
  imageFileId: string | null;
  /** Backend path, e.g. "/files/<id>"; read through the proxy. */
  imageUrl: string | null;
  notes: string | null;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductFilters {
  q: string;
  /** "" for any; the backend includes every group under it. */
  groupId: string;
  type: ProductType | "all";
  status: ProductStatus | "all";
  page: number;
}

/** What the form submits. No code (backend-generated) and no image (own route). */
export interface ProductInput {
  name: string;
  productGroupId: string;
  type: ProductType;
  unitId: string;
  barcode: string;
  salePrice: number;
  /** Left out without products:view-cost. */
  purchasePrice?: number;
  vatRate: number;
  minStock: number | null;
  reorderLevel: number | null;
  maxStock: number | null;
  status: ProductStatus;
  notes: string;
}
