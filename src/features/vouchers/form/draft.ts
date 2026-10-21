import { uaeToday, toDateInputValue } from "@/lib/datetime";

import type { VoucherConfig } from "../config";
import type { VoucherDetail, VoucherInput } from "../types";

/** A line as the form edits it — amounts stay text until submit so typing
 * "12." or clearing a field doesn't fight the input. */
export interface DraftLine {
  id: string;
  accountId: string;
  accountName: string | null;
  narration: string;
  remarks: string;
  /** Snapshot shown in the grid; the backend re-takes it on save. null
   * when balances aren't returned to this user. */
  oldBalance: number | null;
  amount: string;
  vat: string;
}

export interface DraftVoucher {
  voucherDate: string;
  /** "Received Into" / "Paid From". */
  headerAccountId: string;
  /** Collected By / Paid By user. "" until one is picked — required to save. */
  collectedById: string;
  /** Cheque number, transfer reference, etc. Payments and cheque receipts. */
  paymentReference: string;
  /** Cheque receipts only; "" for none. */
  chequeDate: string;
  comments: string;
  lines: DraftLine[];
}

/** `collectedById`: the signed-in user; `headerAccountId`: pre-picked when
 * only one account is allowed. */
export function blankDraft(
  collectedById = "",
  headerAccountId = "",
): DraftVoucher {
  return {
    voucherDate: uaeToday(),
    headerAccountId,
    collectedById,
    paymentReference: "",
    chequeDate: "",
    comments: "",
    lines: [],
  };
}

export function draftFromVoucher(voucher: VoucherDetail): DraftVoucher {
  return {
    voucherDate: toDateInputValue(voucher.voucherDate),
    headerAccountId: voucher.headerAccount.id,
    // Legacy vouchers have only a name here, and must be given a user.
    collectedById: voucher.collectedBy.id ?? "",
    paymentReference: voucher.paymentReference ?? "",
    chequeDate: voucher.chequeDate ? toDateInputValue(voucher.chequeDate) : "",
    comments: voucher.comments,
    lines: voucher.lines.map((line, index) => ({
      // Lines have no id of their own; position is stable for the form's life.
      id: `line-${index}`,
      accountId: line.accountId,
      accountName: line.accountName,
      narration: line.narration,
      remarks: line.remarks,
      oldBalance: line.oldBalance,
      amount: String(line.amount),
      vat: line.vat ? String(line.vat) : "",
    })),
  };
}

const MONEY = /^\d+(\.\d{1,2})?$/;

/** "" counts as 0 only where allowed (VAT); NaN means invalid. */
export function parseMoney(raw: string, blankIsZero = false): number {
  const text = raw.trim();
  if (text === "") return blankIsZero ? 0 : Number.NaN;
  return MONEY.test(text) ? Number(text) : Number.NaN;
}

export interface DraftErrors {
  headerAccount?: string;
  collectedBy?: string;
  paymentReference?: string;
  voucherDate?: string;
  lines?: string;
  /** Per line id. */
  lineAmount: Record<string, string>;
  lineVat: Record<string, string>;
}

/** Checks the form can be sent at all; the backend validates everything else. */
export function validateDraft(
  draft: DraftVoucher,
  copy: Pick<
    VoucherConfig["copy"],
    "headerRequired" | "collectorRequired" | "linesRequired"
  >,
  /** The header is a cheque account: the cheque number is required. */
  isCheque = false,
): {
  errors: DraftErrors;
  valid: boolean;
} {
  const errors: DraftErrors = { lineAmount: {}, lineVat: {} };
  if (!draft.voucherDate) errors.voucherDate = "Pick the voucher date.";
  if (!draft.headerAccountId) errors.headerAccount = copy.headerRequired;
  if (!draft.collectedById) errors.collectedBy = copy.collectorRequired;
  if (isCheque && !draft.paymentReference.trim()) {
    errors.paymentReference = "Enter the cheque number.";
  }
  if (draft.lines.length === 0) {
    errors.lines = copy.linesRequired;
  }
  for (const line of draft.lines) {
    if (Number.isNaN(parseMoney(line.amount))) {
      errors.lineAmount[line.id] =
        "Enter an amount of 0 or more, up to 2 decimals.";
    }
    if (Number.isNaN(parseMoney(line.vat, true))) {
      errors.lineVat[line.id] = "VAT must be 0 or more, up to 2 decimals.";
    }
  }
  const valid =
    !errors.voucherDate &&
    !errors.headerAccount &&
    !errors.collectedBy &&
    !errors.paymentReference &&
    !errors.lines &&
    Object.keys(errors.lineAmount).length === 0 &&
    Object.keys(errors.lineVat).length === 0;
  return { errors, valid };
}

export function toInput(draft: DraftVoucher): VoucherInput {
  return {
    voucherDate: draft.voucherDate,
    headerAccountId: draft.headerAccountId,
    collectedById: draft.collectedById,
    paymentReference: draft.paymentReference,
    chequeDate: draft.chequeDate,
    comments: draft.comments,
    lines: draft.lines.map((line) => ({
      accountId: line.accountId,
      narration: line.narration,
      remarks: line.remarks,
      amount: parseMoney(line.amount),
      vat: parseMoney(line.vat, true),
    })),
  };
}

/** Display totals — the backend recomputes them on save. */
export function draftTotals(lines: DraftLine[]) {
  const cents = (raw: string) => {
    const value = parseMoney(raw, true);
    return Number.isNaN(value) ? 0 : Math.round(value * 100);
  };
  const gross = lines.reduce((sum, line) => sum + cents(line.amount), 0);
  const tax = lines.reduce((sum, line) => sum + cents(line.vat), 0);
  return {
    gross: gross / 100,
    tax: tax / 100,
    grandTotal: (gross + tax) / 100,
  };
}
