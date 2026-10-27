import type { DatePreset } from "@/features/vouchers/filters";
import type { UserRef } from "@/features/vouchers/types";

import type { StockCountStatus } from "./constants";

// The backend's stock-count module (stock-count.service.ts,
// dto/stock-count.dto.ts). Dates arrive as ISO strings.

/** GET /stock-counts item. */
export interface StockCountRow {
  id: string;
  voucherNo: string;
  date: string;
  location: { id: string; name: string | null };
  status: StockCountStatus;
  lineCount: number;
  createdBy: UserRef | null;
  createdAt: string | null;
  submittedBy: UserRef | null;
  commentCount: number;
}

export interface StockCountPage {
  items: StockCountRow[];
  page: number;
  pageSize: number;
  summary: { count: number };
}

export interface StockCountFilters {
  status: "all" | StockCountStatus;
  range: DatePreset;
  from: string;
  to: string;
  locationId: string;
  q: string;
  page: number;
}

/** One line of GET /stock-counts/:id. The system fields are left out
 * without stock:view-system-qty (a blind count). */
export interface StockCountLine {
  productId: string;
  productCode: string | null;
  productName: string | null;
  unit: string | null;
  countedQty: number | null;
  reason: string | null;
  snapshotQty?: number;
  difference?: number | null;
  movedSinceCount?: boolean;
  /** Only with products:view-cost. */
  value?: number;
}

export interface StockCountDetail {
  id: string;
  voucherNo: string;
  date: string;
  location: { id: string; name: string | null };
  comments: string | null;
  status: StockCountStatus;
  snapshotAt: string;
  lines: StockCountLine[];
  totals?: {
    excessQty: number;
    shortageQty: number;
    excessValue?: number;
    shortageValue?: number;
  };
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  submittedBy: UserRef | null;
  submittedAt: string | null;
  approvedBy: UserRef | null;
  approvedAt: string | null;
  rejectedBy: UserRef | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  cancelledBy: UserRef | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

/** What the form saves. A blank count is null. */
export interface StockCountInput {
  date: string;
  locationId: string;
  comments: string;
  lines: { productId: string; countedQty: number | null; reason: string }[];
}

/** POST /stock-counts/validate: one row per file row, in order. */
export interface CheckedCountLine {
  row: number;
  productCode: string | null;
  productId: string | null;
  productName: string | null;
  countedQty: number | null;
  snapshotQty?: number | null;
}

export interface CountRowError {
  row: number;
  productCode: string | null;
  message: string;
}

export interface CountValidationResult {
  valid: boolean;
  lines: CheckedCountLine[];
  errors: CountRowError[];
}
