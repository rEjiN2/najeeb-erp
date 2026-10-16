import type { VoucherStatus } from "@/components/voucher/voucher-status-badge";
import type { MutationResult } from "@/lib/mutation";

// Shapes every cash/bank voucher shares — the backend's vouchers module
// (voucher-posting.service.ts, schemas/voucher.schema.ts, dto/voucher.dto.ts).
// Each voucher names its header account differently on the wire
// (cashAccountId, paidFromAccountId, ...); its api.ts maps that onto
// `headerAccount`. Dates arrive as ISO strings.

export type { VoucherStatus };

/** Derived by the backend from the header account: bank → "bank", else "cash". */
export type PaymentMethod = "cash" | "bank";

export interface UserRef {
  id: string;
  name: string;
}

/** id is null on vouchers entered before the cashier master existed; their
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

/** One row of a voucher list (GET /cash-receipts, GET /cash-payments). */
export interface VoucherListRow {
  id: string;
  voucherNo: string;
  date: string;
  /** The cash, wallet or bank account ("Received Into" / "Paid From"). */
  headerAccount: NamedRef;
  /** id null on vouchers from before the cashier master; name is their old text. */
  cashier: CashierRef;
  paymentMethod: PaymentMethod;
  /** First line's account, plus how many other distinct accounts it touches. */
  partiesSummary: { firstAccount: NamedRef | null; othersCount: number };
  grandTotal: number;
  status: VoucherStatus;
  /** null on vouchers created before audit tracking. */
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  commentCount: number;
}

export interface VoucherPage {
  items: VoucherListRow[];
  page: number;
  pageSize: number;
  /** count: every voucher matching the filter (cancelled included);
   * total: their grand totals, cancelled ones excluded. */
  summary: { count: number; total: number };
}

/** A line of a voucher, with the account's name resolved. */
export interface VoucherLine {
  accountId: string;
  accountName: string | null;
  narration: string;
  remarks: string;
  /** Account balance when the voucher was posted — a snapshot. null when
   * the backend leaves it out (no balances:view). */
  oldBalance: number | null;
  amount: number;
  vat: number;
  netAmount: number;
}

/** One voucher, normalised, with account names resolved. */
export interface VoucherDetail {
  id: string;
  voucherNo: string;
  voucherDate: string;
  headerAccount: NamedRef;
  cashier: CashierRef;
  paymentMethod: PaymentMethod;
  /** Cheque number, transfer reference, etc. */
  paymentReference: string | null;
  comments: string;
  lines: VoucherLine[];
  grossTotal: number;
  totalTax: number;
  grandTotal: number;
  status: VoucherStatus;
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
  /** Absent without balances:view. */
  balance?: number;
}

/** What the form submits (create and edit). Totals are the backend's job. */
export interface VoucherInput {
  voucherDate: string;
  headerAccountId: string;
  cashierId: string;
  paymentReference: string;
  comments: string;
  lines: {
    accountId: string;
    narration: string;
    remarks: string;
    amount: number;
    vat: number;
  }[];
}

/** Something the user must confirm before the voucher is saved (409). */
export interface VoucherWarning {
  code: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  balanceBefore: number;
  balanceAfter: number;
  message: string;
}

/** A save that may come back asking for warnings to be acknowledged. */
export type VoucherSaveResult =
  | MutationResult
  | { ok: false; messages: string[]; status: 409; warnings: VoucherWarning[] };

/** The Server Actions a voucher form saves through. Vouchers without
 * warnings (receipts) ignore `acknowledgeWarnings`. */
export type CreateVoucherAction = (
  input: VoucherInput,
  acknowledgeWarnings: boolean,
) => Promise<VoucherSaveResult>;

export type UpdateVoucherAction = (
  id: string,
  input: VoucherInput,
  changeNote: string,
  acknowledgeWarnings: boolean,
) => Promise<VoucherSaveResult>;

export type CancelVoucherAction = (
  id: string,
  reason: string,
) => Promise<MutationResult>;
