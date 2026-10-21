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
  headerKey: "",
  sendsReference: false,
  acknowledgesWarnings: false,
  listPath: CASH_HANDOVERS_PATH,
  viewPath: cashHandoverPath,
  forbiddenMessage: "You don't have permission to do that with cash handovers.",
  savedMessage: (voucherNo) => `Handover ${voucherNo} submitted`,
  cancelledMessage: (voucherNo) => `Cash handover ${voucherNo} cancelled`,
};

/** 403s that explain themselves (own handover, scope) are shown as sent. */
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

/** Records the amounts; the money moves only on approval. */
export async function submitCashHandover(
  input: HandoverInput,
): Promise<MutationResult> {
  const notes = input.notes.trim();
  return send(
    TARGET.path,
    {
      voucherDate: input.voucherDate,
      ...(input.userId ? { userId: input.userId } : {}),
      lines: input.lines,
      ...(notes ? { notes } : {}),
    },
    `${CASH_HANDOVERS_PATH}/new`,
    (saved) => TARGET.savedMessage(saved.voucherNo),
  );
}

/** Posts each received amount from its source into its receiving account. */
export async function approveCashHandover(
  id: string,
  input: ApproveInput,
): Promise<MutationResult> {
  const reason = input.reason.trim();
  return send(
    `${TARGET.path}/${encodeURIComponent(id)}/approve`,
    { lines: input.lines, ...(reason ? { reason } : {}) },
    cashHandoverPath(id),
    (saved) => `Handover ${saved.voucherNo} approved`,
  );
}

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

/** Submitter while pending, or cash-handovers:cancel (reverses an approval). */
export async function cancelCashHandover(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return cancelVoucher(TARGET, id, reason);
}
