"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";
import {
  cancelVoucher,
  type VoucherWriteTarget,
} from "@/features/vouchers/mutations";

import { CASH_HANDOVERS_PATH, cashHandoverPath } from "./constants";
import type { ApproveInput, HandoverInput } from "./types";

// Server Actions are public endpoints: the backend authenticates the forwarded
// cookie, checks the cash-handovers permissions and data scope, and validates
// every field. Bodies are rebuilt field by field because the backend rejects
// unknown properties.

interface SavedHandover {
  _id: string;
  voucherNo: string;
}

const TARGET: VoucherWriteTarget = {
  path: "/cash-handovers",
  headerKey: "sourceAccountId",
  sendsReference: false,
  acknowledgesWarnings: false,
  listPath: CASH_HANDOVERS_PATH,
  viewPath: cashHandoverPath,
  forbiddenMessage: "You don't have permission to do that with cash handovers.",
  savedMessage: (voucherNo) => `Handover ${voucherNo} submitted`,
  cancelledMessage: (voucherNo) => `Cash handover ${voucherNo} cancelled`,
};

/** 403s from the data scope say what to fix; only the guard's bare one is generic. */
function forbidden(messages: string[]): string {
  return messages.length > 0 && messages[0] !== "Insufficient permissions"
    ? messages.join(" ")
    : TARGET.forbiddenMessage;
}

async function send(
  path: string,
  body: Record<string, unknown>,
  returnTo: string,
  successMessage: (saved: SavedHandover) => string,
): Promise<MutationResult> {
  const result = await apiSend<SavedHandover>("POST", path, body);
  return runMutation(Promise.resolve(result), {
    returnTo,
    forbiddenMessage:
      !result.ok && result.reason === "forbidden"
        ? forbidden(result.messages)
        : TARGET.forbiddenMessage,
    successMessage,
    getId: (saved) => saved._id,
  });
}

/** Submits the receipts and locks them until approved or rejected. */
export async function submitCashHandover(
  input: HandoverInput,
): Promise<MutationResult> {
  const notes = input.notes.trim();
  return send(
    TARGET.path,
    {
      voucherDate: input.voucherDate,
      ...(input.staffId ? { staffId: input.staffId } : {}),
      sourceAccountId: input.sourceAccountId,
      receiptIds: input.receiptIds,
      countedCash: input.countedCash,
      ...(notes ? { notes } : {}),
    },
    `${CASH_HANDOVERS_PATH}/new`,
    (saved) => TARGET.savedMessage(saved.voucherNo),
  );
}

/** Posts the received cash and settles every receipt. */
export async function approveCashHandover(
  id: string,
  input: ApproveInput,
): Promise<MutationResult> {
  const reason = input.varianceReason.trim();
  return send(
    `${TARGET.path}/${encodeURIComponent(id)}/approve`,
    {
      receivedCash: input.receivedCash,
      receivedIntoAccountId: input.receivedIntoAccountId,
      ...(reason ? { varianceReason: reason } : {}),
    },
    cashHandoverPath(id),
    (saved) => `Handover ${saved.voucherNo} approved`,
  );
}

/** Unlocks the receipts so they can be handed over again. */
export async function rejectCashHandover(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return send(
    `${TARGET.path}/${encodeURIComponent(id)}/reject`,
    { reason: reason.trim() },
    cashHandoverPath(id),
    (saved) => `Handover ${saved.voucherNo} rejected`,
  );
}

/** Submitter before approval, or cash-handovers:cancel (reverses an approval). */
export async function cancelCashHandover(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return cancelVoucher(TARGET, id, reason);
}
