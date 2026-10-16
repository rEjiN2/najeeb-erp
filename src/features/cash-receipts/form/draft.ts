import { uaeToday, toDateInputValue } from "@/lib/datetime";

import type { CashReceiptDetail, CashReceiptInput } from "../types";

/** A line as the form edits it — amounts stay text until submit so typing
 * "12." or clearing a field doesn't fight the input. */
export interface DraftLine {
  id: string;
  accountId: string;
  accountName: string | null;
  narration: string;
  remarks: string;
  /** Snapshot shown in the grid; the backend re-takes it on save. */
  oldBalance: number;
  amount: string;
  vat: string;
}

export interface DraftVoucher {
  voucherDate: string;
  cashAccountId: string;
  /** "" until one is picked — required to save. */
  cashierId: string;
  comments: string;
  lines: DraftLine[];
}

/** `cashierId`: the signed-in user's own cashier, when they have an active one. */
export function blankDraft(cashierId = ""): DraftVoucher {
  return {
    voucherDate: uaeToday(),
    cashAccountId: "",
    cashierId,
    comments: "",
    lines: [],
  };
}

export function draftFromReceipt(receipt: CashReceiptDetail): DraftVoucher {
  return {
    voucherDate: toDateInputValue(receipt.voucherDate),
    cashAccountId: receipt.cashAccount.id,
    // Legacy receipts have only free text here, and must be given a cashier.
    cashierId: receipt.cashier.id ?? "",
    comments: receipt.comments,
    lines: receipt.lines.map((line, index) => ({
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
  cashAccount?: string;
  cashier?: string;
  voucherDate?: string;
  lines?: string;
  /** Per line id. */
  lineAmount: Record<string, string>;
  lineVat: Record<string, string>;
}

/** Checks the form can be sent at all; the backend validates everything else. */
export function validateDraft(draft: DraftVoucher): {
  errors: DraftErrors;
  valid: boolean;
} {
  const errors: DraftErrors = { lineAmount: {}, lineVat: {} };
  if (!draft.voucherDate) errors.voucherDate = "Pick the voucher date.";
  if (!draft.cashAccountId) errors.cashAccount = "Select a cash account.";
  if (!draft.cashierId)
    errors.cashier = "Select the cashier who collected the cash.";
  if (draft.lines.length === 0) {
    errors.lines = "Add at least one account to receive from.";
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
    !errors.cashAccount &&
    !errors.cashier &&
    !errors.lines &&
    Object.keys(errors.lineAmount).length === 0 &&
    Object.keys(errors.lineVat).length === 0;
  return { errors, valid };
}

export function toInput(draft: DraftVoucher): CashReceiptInput {
  return {
    voucherDate: draft.voucherDate,
    cashAccountId: draft.cashAccountId,
    cashierId: draft.cashierId,
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
