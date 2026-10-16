"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { CASH_RECEIPTS_PATH, cashReceiptPath } from "./constants";
import type { CashReceiptInput } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks cash-receipts:manage and validates every field, so these only
// shape the request. Bodies are rebuilt field by field because the backend
// rejects unknown properties — totals, voucher numbers and who/when included.

const FORBIDDEN = "You don't have permission to manage cash receipts.";

interface SavedReceipt {
  _id: string;
  voucherNo: string;
}

function toLines(input: CashReceiptInput) {
  return input.lines.map((line) => ({
    accountId: line.accountId,
    amount: line.amount,
    vat: line.vat,
    ...(line.narration.trim() ? { narration: line.narration.trim() } : {}),
    ...(line.remarks.trim() ? { remarks: line.remarks.trim() } : {}),
  }));
}

export async function createCashReceipt(
  input: CashReceiptInput,
): Promise<MutationResult> {
  const comments = input.comments.trim();

  return runMutation(
    apiSend<SavedReceipt>("POST", "/cash-receipts", {
      voucherDate: input.voucherDate,
      cashAccountId: input.cashAccountId,
      cashierId: input.cashierId,
      ...(comments ? { comments } : {}),
      lines: toLines(input),
    }),
    {
      returnTo: CASH_RECEIPTS_PATH,
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Receipt ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

/**
 * Sends the whole voucher; the backend diffs it and answers "No changes to
 * save" when nothing visible changed. Blank comments are sent as "" so
 * clearing them is an edit, not "leave as is".
 */
export async function updateCashReceipt(
  id: string,
  input: CashReceiptInput,
  changeNote: string,
): Promise<MutationResult> {
  const note = changeNote.trim();

  return runMutation(
    apiSend<SavedReceipt>("PATCH", `/cash-receipts/${encodeURIComponent(id)}`, {
      voucherDate: input.voucherDate,
      cashAccountId: input.cashAccountId,
      cashierId: input.cashierId,
      comments: input.comments.trim(),
      lines: toLines(input),
      ...(note ? { changeNote: note } : {}),
    }),
    {
      returnTo: cashReceiptPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Receipt ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

/** Reverses the posting; the voucher stays, marked cancelled. */
export async function cancelCashReceipt(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedReceipt>(
      "POST",
      `/cash-receipts/${encodeURIComponent(id)}/cancel`,
      { reason: reason.trim() },
    ),
    {
      returnTo: cashReceiptPath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Cash receipt ${saved.voucherNo} cancelled`,
    },
  );
}
