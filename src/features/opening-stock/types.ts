import type { DatePreset } from "@/features/vouchers/filters";
import type { UserRef, VoucherStatus } from "@/features/vouchers/types";

// The backend's opening-stock module (opening-stock.service.ts,
// dto/opening-stock.dto.ts). Dates arrive as ISO strings.

/** GET /opening-stock item. */
export interface OpeningStockRow {
  id: string;
  voucherNo: string;
  asOfDate: string;
  location: { id: string; name: string | null };
  lineCount: number;
  totalQty: number;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  commentCount: number;
}

export interface OpeningStockPage {
  items: OpeningStockRow[];
  page: number;
  pageSize: number;
  summary: { count: number };
}

export interface OpeningStockFilters {
  range: DatePreset;
  from: string;
  to: string;
  status: "all" | "posted" | "cancelled";
  locationId: string;
  page: number;
}

/** One product's line, with the product resolved. */
export interface OpeningStockLine {
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  qty: number;
  unitCost: number | null;
}

/** CheckedStockLine / StockRowError from POST /opening-stock/validate. */
export interface CheckedStockLine {
  row: number;
  productCode: string | null;
  productId: string | null;
  productName: string | null;
  productType: string | null;
  qty: number;
  unitCost: number | null;
}

export interface StockRowError {
  row: number;
  productCode: string | null;
  message: string;
}

export interface StockValidationResult {
  valid: boolean;
  lines: CheckedStockLine[];
  errors: StockRowError[];
  totalQty: number;
}

/** What the form submits. */
export interface OpeningStockInput {
  asOfDate: string;
  locationId: string;
  comments: string;
  lines: { productId: string; qty: number; unitCost: number | null }[];
}
