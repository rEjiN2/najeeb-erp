import "server-only";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import type { VoucherInput, VoucherSaveResult, VoucherWarning } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks the voucher's manage permission and validates every field, so
// these only shape the request. Bodies are rebuilt field by field because the
// backend rejects unknown properties — totals, voucher numbers, the payment
// method and who/when included.

interface SavedVoucher {
  _id: string;
  voucherNo: string;
}

/** How one voucher type's writes are spelled and described. */
export interface VoucherWriteTarget {
  /** e.g. "/cash-receipts". */
  path: string;
  /** Body key of the header account, e.g. "cashAccountId". */
  headerKey: string;
  /** Whether the body carries paymentReference. */
  sendsReference: boolean;
  /** Receipts: the body carries paymentMethod, and no header for a cheque. */
  sendsMethod?: boolean;
  /** Whether a 409 with warnings can be acknowledged and resent. */
  acknowledgesWarnings: boolean;
  listPath: string;
  viewPath: (id: string) => string;
  forbiddenMessage: string;
  /** e.g. (no) => `Receipt ${no} saved`. */
  savedMessage: (voucherNo: string) => string;
  cancelledMessage: (voucherNo: string) => string;
}

function toLines(input: VoucherInput) {
  return input.lines.map((line) => ({
    accountId: line.accountId,
    amount: line.amount,
    vat: line.vat,
    ...(line.narration.trim() ? { narration: line.narration.trim() } : {}),
    ...(line.remarks.trim() ? { remarks: line.remarks.trim() } : {}),
  }));
}

function isWarning(value: unknown): value is VoucherWarning {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

/** Sends one voucher write; a 409 with warnings comes back to confirm. */
export async function sendVoucher(
  target: VoucherWriteTarget,
  method: "POST" | "PATCH",
  path: string,
  body: Record<string, unknown>,
  returnTo: string,
): Promise<VoucherSaveResult> {
  const result = await apiSend<SavedVoucher>(method, path, body);

  // Nothing was saved: hand the warnings back for the user to confirm.
  if (
    target.acknowledgesWarnings &&
    !result.ok &&
    result.status === 409 &&
    result.warnings?.length
  ) {
    const warnings = result.warnings.filter(isWarning);
    if (warnings.length > 0) {
      return { ok: false, status: 409, messages: result.messages, warnings };
    }
  }

  // Data-scope refusals (another collector, an account not assigned to the
  // user) are 403s that say what to fix; only the guard's bare one is generic.
  const scopeMessage =
    !result.ok &&
    result.reason === "forbidden" &&
    result.messages.length > 0 &&
    result.messages[0] !== "Insufficient permissions"
      ? result.messages.join(" ")
      : null;

  return runMutation(Promise.resolve(result), {
    returnTo,
    forbiddenMessage: scopeMessage ?? target.forbiddenMessage,
    successMessage: (saved) => target.savedMessage(saved.voucherNo),
    getId: (saved) => saved._id,
  });
}

export function createVoucher(
  target: VoucherWriteTarget,
  input: VoucherInput,
  acknowledgeWarnings: boolean,
): Promise<VoucherSaveResult> {
  const comments = input.comments.trim();
  const reference = input.paymentReference.trim();

  return sendVoucher(
    target,
    "POST",
    target.path,
    {
      voucherDate: input.voucherDate,
      ...(input.headerAccountId
        ? { [target.headerKey]: input.headerAccountId }
        : {}),
      ...(target.sendsMethod ? { paymentMethod: input.paymentMethod } : {}),
      collectedById: input.collectedById,
      ...(reference ? { paymentReference: reference } : {}),
      // Cheque receipts only; the backend requires all three there.
      ...(input.chequeNumber.trim()
        ? { chequeNumber: input.chequeNumber.trim() }
        : {}),
      ...(input.chequeDate ? { chequeDate: input.chequeDate } : {}),
      ...(input.chequeBankName.trim()
        ? { chequeBankName: input.chequeBankName.trim() }
        : {}),
      ...(comments ? { comments } : {}),
      lines: toLines(input),
      ...(target.acknowledgesWarnings && acknowledgeWarnings
        ? { acknowledgeWarnings: true }
        : {}),
    },
    target.listPath,
  );
}

/**
 * Sends the whole voucher; the backend diffs it and answers "No changes to
 * save" when nothing visible changed. Blank comments (and references) are
 * sent as "" so clearing them is an edit, not "leave as is".
 */
export function updateVoucher(
  target: VoucherWriteTarget,
  id: string,
  input: VoucherInput,
  changeNote: string,
  acknowledgeWarnings: boolean,
): Promise<VoucherSaveResult> {
  const note = changeNote.trim();

  return sendVoucher(
    target,
    "PATCH",
    `${target.path}/${encodeURIComponent(id)}`,
    {
      voucherDate: input.voucherDate,
      ...(input.headerAccountId
        ? { [target.headerKey]: input.headerAccountId }
        : {}),
      ...(target.sendsMethod ? { paymentMethod: input.paymentMethod } : {}),
      collectedById: input.collectedById,
      ...(target.sendsReference || input.paymentReference.trim()
        ? { paymentReference: input.paymentReference.trim() }
        : {}),
      chequeNumber: input.chequeNumber.trim() || null,
      chequeDate: input.chequeDate || null,
      chequeBankName: input.chequeBankName.trim() || null,
      comments: input.comments.trim(),
      lines: toLines(input),
      ...(note ? { changeNote: note } : {}),
      ...(target.acknowledgesWarnings && acknowledgeWarnings
        ? { acknowledgeWarnings: true }
        : {}),
    },
    target.viewPath(id),
  );
}

/** Reverses the posting; the voucher stays, marked cancelled. */
export function cancelVoucher(
  target: VoucherWriteTarget,
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<SavedVoucher>(
      "POST",
      `${target.path}/${encodeURIComponent(id)}/cancel`,
      { reason: reason.trim() },
    ),
    {
      returnTo: target.viewPath(id),
      forbiddenMessage: target.forbiddenMessage,
      successMessage: (saved) => target.cancelledMessage(saved.voucherNo),
    },
  );
}
