"use server";

import type { MutationResult } from "@/lib/mutation";
import {
  cancelVoucher,
  createVoucher,
  updateVoucher,
  type VoucherWriteTarget,
} from "@/features/vouchers/mutations";
import type {
  VoucherInput,
  VoucherSaveResult,
} from "@/features/vouchers/types";

import { CASH_PAYMENTS_PATH, cashPaymentPath } from "./constants";

const TARGET: VoucherWriteTarget = {
  path: "/cash-payments",
  headerKey: "paidFromAccountId",
  sendsReference: true,
  // Taking a cash or wallet account below zero comes back as a 409 to confirm.
  acknowledgesWarnings: true,
  listPath: CASH_PAYMENTS_PATH,
  viewPath: cashPaymentPath,
  forbiddenMessage: "You don't have permission to manage cash payments.",
  savedMessage: (voucherNo) => `Payment ${voucherNo} saved`,
  cancelledMessage: (voucherNo) => `Cash payment ${voucherNo} cancelled`,
};

export async function createCashPayment(
  input: VoucherInput,
  acknowledgeWarnings: boolean,
): Promise<VoucherSaveResult> {
  return createVoucher(TARGET, input, acknowledgeWarnings);
}

export async function updateCashPayment(
  id: string,
  input: VoucherInput,
  changeNote: string,
  acknowledgeWarnings: boolean,
): Promise<VoucherSaveResult> {
  return updateVoucher(TARGET, id, input, changeNote, acknowledgeWarnings);
}

/** Reverses the posting; the voucher stays, marked cancelled. */
export async function cancelCashPayment(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return cancelVoucher(TARGET, id, reason);
}
