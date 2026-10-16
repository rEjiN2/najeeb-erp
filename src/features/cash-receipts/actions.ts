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

import { CASH_RECEIPTS_PATH, cashReceiptPath } from "./constants";

const TARGET: VoucherWriteTarget = {
  path: "/cash-receipts",
  headerKey: "cashAccountId",
  sendsReference: false,
  acknowledgesWarnings: false,
  listPath: CASH_RECEIPTS_PATH,
  viewPath: cashReceiptPath,
  forbiddenMessage: "You don't have permission to manage cash receipts.",
  savedMessage: (voucherNo) => `Receipt ${voucherNo} saved`,
  cancelledMessage: (voucherNo) => `Cash receipt ${voucherNo} cancelled`,
};

export async function createCashReceipt(
  input: VoucherInput,
): Promise<VoucherSaveResult> {
  return createVoucher(TARGET, input, false);
}

export async function updateCashReceipt(
  id: string,
  input: VoucherInput,
  changeNote: string,
): Promise<VoucherSaveResult> {
  return updateVoucher(TARGET, id, input, changeNote, false);
}

/** Reverses the posting; the voucher stays, marked cancelled. */
export async function cancelCashReceipt(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return cancelVoucher(TARGET, id, reason);
}
