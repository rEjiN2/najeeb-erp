"use server";

import type { MutationResult } from "@/lib/mutation";
import {
  cancelVoucher,
  sendVoucher,
  type VoucherWriteTarget,
} from "@/features/vouchers/mutations";
import type { VoucherSaveResult } from "@/features/vouchers/types";

import { CASH_HANDOVERS_PATH, cashHandoverPath } from "./constants";
import type { HandoverInput } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks the cash-handovers permissions and data scope, and validates
// every field. Bodies are rebuilt field by field because the backend rejects
// unknown properties.

const TARGET: VoucherWriteTarget = {
  path: "/cash-handovers",
  headerKey: "fromAccountId",
  sendsReference: true,
  // Taking a cash or wallet "from" account below zero comes back as a 409.
  acknowledgesWarnings: true,
  listPath: CASH_HANDOVERS_PATH,
  viewPath: cashHandoverPath,
  forbiddenMessage: "You don't have permission to manage cash handovers.",
  savedMessage: (voucherNo) => `Handover ${voucherNo} saved`,
  cancelledMessage: (voucherNo) => `Cash handover ${voucherNo} cancelled`,
};

function toBody(input: HandoverInput) {
  return {
    voucherDate: input.voucherDate,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    amount: input.amount,
    handedByCashierId: input.handedByCashierId,
    receivedByCashierId: input.receivedByCashierId,
  };
}

export async function createCashHandover(
  input: HandoverInput,
  acknowledgeWarnings: boolean,
): Promise<VoucherSaveResult> {
  const reference = input.reference.trim();
  const notes = input.notes.trim();
  return sendVoucher(
    TARGET,
    "POST",
    TARGET.path,
    {
      ...toBody(input),
      ...(reference ? { reference } : {}),
      ...(notes ? { notes } : {}),
      ...(acknowledgeWarnings ? { acknowledgeWarnings: true } : {}),
    },
    TARGET.listPath,
  );
}

/**
 * Sends the whole handover; the backend diffs it and answers "No changes to
 * save" when nothing changed. Blank reference and notes are sent as "" so
 * clearing them is an edit.
 */
export async function updateCashHandover(
  id: string,
  input: HandoverInput,
  changeNote: string,
  acknowledgeWarnings: boolean,
): Promise<VoucherSaveResult> {
  const note = changeNote.trim();
  return sendVoucher(
    TARGET,
    "PATCH",
    `${TARGET.path}/${encodeURIComponent(id)}`,
    {
      ...toBody(input),
      reference: input.reference.trim(),
      notes: input.notes.trim(),
      ...(note ? { changeNote: note } : {}),
      ...(acknowledgeWarnings ? { acknowledgeWarnings: true } : {}),
    },
    TARGET.viewPath(id),
  );
}

/** Reverses the posting; the handover stays, marked cancelled. */
export async function cancelCashHandover(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return cancelVoucher(TARGET, id, reason);
}
