import type { VoucherStatus } from "@/components/voucher/voucher-status-badge";

// Mirrors the backend's cash-receipts module (cash-receipt.service.ts,
// schemas/cash-receipt.schema.ts, dto/*). Dates arrive as ISO strings.

export type CashReceiptStatus = VoucherStatus;

export interface UserRef {
  id: string;
  name: string;
}

/** id is null on receipts entered before the cashier master existed; their
 * free-text cashier survives as the name. */
export interface CashierRef {
  id: string | null;
  name: string | null;
}

export interface NamedRef {
  id: string;
  /** null when the account no longer exists. */
  name: string | null;
}

/** One row of GET /cash-receipts. */
export interface CashReceiptListRow {
  id: string;
  voucherNo: string;
  date: string;
  cashAccount: NamedRef;
  /** id null on receipts from before the cashier master; name is their old text. */
  cashier: CashierRef;
  /** First line's account, plus how many other distinct accounts it touches. */
  partiesSummary: { firstAccount: NamedRef | null; othersCount: number };
  grandTotal: number;
  status: CashReceiptStatus;
  /** null on receipts created before audit tracking. */
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  commentCount: number;
}

/** GET /cash-receipts response. */
export interface CashReceiptPage {
  items: CashReceiptListRow[];
  page: number;
  pageSize: number;
  /** count: every receipt matching the filter (cancelled included);
   * total: their grand totals, cancelled ones excluded. */
  summary: { count: number; total: number };
}

/** A line of GET /cash-receipts/:id, with the account's name resolved. */
export interface CashReceiptLine {
  accountId: string;
  accountName: string | null;
  narration: string;
  remarks: string;
  /** Account balance when the voucher was posted — a snapshot. */
  oldBalance: number;
  amount: number;
  vat: number;
  netAmount: number;
}

/** GET /cash-receipts/:id, normalised, with account names resolved. */
export interface CashReceiptDetail {
  id: string;
  voucherNo: string;
  voucherDate: string;
  cashAccount: NamedRef;
  cashier: CashierRef;
  comments: string;
  lines: CashReceiptLine[];
  grossTotal: number;
  totalTax: number;
  grandTotal: number;
  status: CashReceiptStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  cancelledBy: UserRef | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

/** GET /accounts/lookup item. */
export interface AccountLookupItem {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

/** What the form submits (create and edit). Totals are the backend's job. */
export interface CashReceiptInput {
  voucherDate: string;
  cashAccountId: string;
  cashierId: string;
  comments: string;
  lines: {
    accountId: string;
    narration: string;
    remarks: string;
    amount: number;
    vat: number;
  }[];
}
