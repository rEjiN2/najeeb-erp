import type { DatePreset } from "@/features/vouchers/filters";
import type { UserRef, VoucherStatus } from "@/features/vouchers/types";

// The backend's returns module (return.service.ts, dto/return.dto.ts).
// Dates arrive as ISO strings.

export type ReturnKind = "sales" | "purchase";

/** GET /sales-returns | /purchase-returns item. */
export interface ReturnRow {
  id: string;
  voucherNo: string;
  voucherDate: string;
  invoice: { id: string; voucherNo: string };
  party: { id: string; name: string | null };
  location: { id: string; name: string | null };
  reason: string;
  lineCount: number;
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  commentCount: number;
}

export interface ReturnPage {
  items: ReturnRow[];
  page: number;
  pageSize: number;
  /** netTotal leaves out cancelled returns. */
  summary: { count: number; netTotal: number };
}

export interface ReturnFilters {
  range: DatePreset;
  from: string;
  to: string;
  status: "all" | "posted" | "cancelled";
  partyId: string;
  invoiceId: string;
  /** Return or invoice number. */
  q: string;
  page: number;
}

/** One returned line, with the product resolved. */
export interface ReturnLine {
  invoiceLineId: string;
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  qty: number;
  restock: boolean;
  rate: number;
  discount: number;
  amount: number;
  vatRate: number;
  vat: number;
  netAmount: number;
}

/** An invoice line as the return form needs it. */
export interface ReturnSourceLine {
  invoiceLineId: string;
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  /** Sold / bought. */
  qty: number;
  returnedQty: number;
  amount: number;
  vat: number;
}

/** The invoice a return is made against. */
export interface ReturnSource {
  id: string;
  voucherNo: string;
  partyId: string;
  partyName: string | null;
  locationId: string;
  status: VoucherStatus;
  balance: number;
  lines: ReturnSourceLine[];
}

/** What the form submits. */
export interface ReturnInput {
  invoiceId: string;
  date: string;
  locationId: string;
  reason: string;
  lines: { invoiceLineId: string; qty: number; restock: boolean }[];
}

/** A return listed on its invoice's view page. */
export type InvoiceReturn = Pick<
  ReturnRow,
  "id" | "voucherNo" | "voucherDate" | "netTotal" | "status" | "reason"
>;
