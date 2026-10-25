import type { VoucherStatus } from "@/components/voucher/voucher-status-badge";
import type { MutationResult } from "@/lib/mutation";

// Shapes every cash/bank voucher shares — the backend's vouchers module
// (voucher-posting.service.ts, schemas/voucher.schema.ts, dto/voucher.dto.ts).
// Each voucher names its header account differently on the wire
// (cashAccountId, paidFromAccountId, ...); its api.ts maps that onto
// `headerAccount`. Dates arrive as ISO strings.

export type { VoucherStatus };

/** Derived by the backend from the header account: bank → "bank",
 * cheque → "cheque", else "cash". */
export type PaymentMethod = "cash" | "cheque" | "bank";

/** Where a cheque received on a receipt stands (backend ChequeStatus). */
export type ChequeStatus =
  | "with_salesman"
  | "submitted"
  | "at_office"
  | "deposited"
  | "cleared"
  | "returned";

export interface UserRef {
  id: string;
  name: string;
}

/** Collected By / Paid By user. id is null on legacy vouchers whose old
 * cashier had no login; their name survives as collectedByName. */
export interface CollectorRef {
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
  collectedBy: CollectorRef;
  paymentMethod: PaymentMethod;
  /** Cheque receipts only; null otherwise. */
  cheque: {
    number: string | null;
    bankName: string | null;
    date: string | null;
    status: ChequeStatus | null;
  } | null;
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
  /** Payments: bills this line settles (active allocations); the rest is on account. */
  allocations?: LineAllocation[];
}

/** Part of a payment line applied to a bill (backend AllocationTargetDto). */
export interface LineAllocation {
  targetType: "purchase-invoice" | "sales-invoice" | "opening-balance";
  targetId: string;
  /** The bill's voucher number, e.g. PI-0001. */
  number: string;
  amount: number;
}

/** A file on a receipt (cheque photo, transfer slip). */
export interface VoucherAttachment {
  id: string;
  /** GET /files/:fileId through the proxy. */
  fileId: string;
  title: string;
  mimeType: string;
  uploadedAt: string;
}

/** One voucher, normalised, with account names resolved. */
export interface VoucherDetail {
  id: string;
  voucherNo: string;
  voucherDate: string;
  headerAccount: NamedRef;
  collectedBy: CollectorRef;
  paymentMethod: PaymentMethod;
  /** Cheque number, transfer reference, etc. */
  paymentReference: string | null;
  /** Cheque vouchers only. */
  chequeDate: string | null;
  chequeNumber: string | null;
  /** The bank the cheque is drawn on. */
  chequeBankName: string | null;
  chequeStatus: ChequeStatus | null;
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
  /** Fields only one voucher type has (e.g. a handover's Received By). */
  extraFields: VoucherExtraField[];
  /** Receipts only; [] elsewhere. */
  attachments: VoucherAttachment[];
}

export interface VoucherExtraField {
  key: string;
  label: string;
  /** Display text; null shows a dash. */
  value: string | null;
  /** The referenced record's id, when the field names one. */
  id?: string | null;
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
  collectedById: string;
  /** Receipts send it; "" headerAccountId with cheque lets the server pick. */
  paymentMethod: PaymentMethod;
  paymentReference: string;
  /** Cheque vouchers only; "" for none. */
  chequeDate: string;
  chequeNumber: string;
  chequeBankName: string;
  comments: string;
  lines: {
    accountId: string;
    narration: string;
    remarks: string;
    amount: number;
    vat: number;
    /** Payments only; sending lines replaces the payment's allocations. */
    allocations?: LineAllocation[];
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
