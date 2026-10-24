import type { DatePreset } from "@/features/vouchers/filters";
import type { UserRef } from "@/features/vouchers/types";

// The backend's stock module (stock.service.ts, dto/stock.dto.ts).
// Dates arrive as ISO strings.

export type StockStatus = "ok" | "reorder" | "below_min";

/** GET /stock/summary item. */
export interface StockSummaryRow {
  productId: string;
  code: string;
  name: string;
  group: { id: string; name: string } | null;
  unit: { id: string; name: string; symbol: string } | null;
  total: number;
  /** Only locations holding some stock; scoped users see only theirs. */
  byLocation: { locationId: string; name: string | null; qty: number }[];
  status: StockStatus;
  /** total × purchase price; absent without products:view-cost. */
  value?: number;
}

export interface StockSummaryPage {
  items: StockSummaryRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockSummaryFilters {
  q: string;
  /** Includes every group under it. */
  groupId: string;
  locationId: string;
  lowStock: boolean;
  page: number;
}

/** GET /stock/history item. */
export interface StockHistoryEntry {
  id: string;
  date: string;
  voucherType: string;
  voucherId: string;
  voucherNo: string;
  location: { id: string; name: string | null };
  in: number;
  out: number;
  /** Running balance after this entry. */
  balance: number;
  isReversal: boolean;
  by: UserRef | null;
}

export interface StockHistory {
  productId: string;
  /** Balance before dateFrom (0 without one). */
  opening: number;
  closing: number;
  items: StockHistoryEntry[];
}

export interface StockHistoryFilters {
  productId: string;
  locationId: string;
  range: DatePreset;
  from: string;
  to: string;
}

/** GET /products/lookup item, as the product pickers use it. */
export interface ProductLookupItem {
  id: string;
  code: string;
  name: string;
  unit: { id: string; name: string; symbol: string } | null;
}
