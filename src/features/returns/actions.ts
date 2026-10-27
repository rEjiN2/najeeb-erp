"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { RETURN_KINDS, isReturnKind, returnPath } from "./constants";
import type { ReturnInput, ReturnKind } from "./types";

// Server Actions are public endpoints: the backend checks the returns
// permissions, the quantities left, the stock and the credit. Its messages
// are shown as they are (over-return, stock already used, ...).

interface Saved {
  _id: string;
  voucherNo: string;
}

export async function createReturn(
  kind: ReturnKind,
  input: ReturnInput,
): Promise<MutationResult> {
  if (!isReturnKind(kind)) {
    return { ok: false, messages: ["Unknown return type."] };
  }
  const info = RETURN_KINDS[kind];
  return runMutation(
    apiSend<Saved>("POST", info.apiPath, {
      [kind === "sales" ? "salesInvoiceId" : "purchaseInvoiceId"]:
        input.invoiceId,
      date: input.date,
      locationId: input.locationId,
      reason: input.reason.trim(),
      lines: input.lines.map((line) => ({
        invoiceLineId: line.invoiceLineId,
        qty: line.qty,
        ...(kind === "sales" ? { restock: line.restock } : {}),
      })),
    }),
    {
      returnTo: `${info.path}/new?${new URLSearchParams({ invoice: input.invoiceId })}`,
      forbiddenMessage: `You don't have permission to create ${info.config.nounPlural}.`,
      successMessage: (saved) => `${info.config.Noun} ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

async function cancelReturn(
  kind: ReturnKind,
  id: string,
  reason: string,
): Promise<MutationResult> {
  const info = RETURN_KINDS[kind];
  return runMutation(
    apiSend<Saved>("POST", `${info.apiPath}/${encodeURIComponent(id)}/cancel`, {
      reason: reason.trim(),
    }),
    {
      returnTo: returnPath(kind, id),
      forbiddenMessage: `You don't have permission to cancel ${info.config.nounPlural}.`,
      successMessage: (saved) =>
        `${info.config.Noun} ${saved.voucherNo} cancelled`,
    },
  );
}

/** Gives the credit back and reverses the stock movement. */
export async function cancelSalesReturn(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return cancelReturn("sales", id, reason);
}

export async function cancelPurchaseReturn(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return cancelReturn("purchase", id, reason);
}

export interface RefundInput {
  voucherDate: string;
  accountId: string;
  amount: number;
  paymentReference: string;
  acknowledgeWarnings?: boolean;
}

/** Pays the credit left on account out in cash (sales) or takes it in (purchase); posts the voucher. */
export async function refundReturn(
  kind: ReturnKind,
  id: string,
  input: RefundInput,
): Promise<MutationResult> {
  if (!isReturnKind(kind)) {
    return { ok: false, messages: ["Unknown return type."] };
  }
  const info = RETURN_KINDS[kind];
  return runMutation(
    apiSend<Saved>("POST", `${info.apiPath}/${encodeURIComponent(id)}/refund`, {
      voucherDate: input.voucherDate,
      accountId: input.accountId,
      amount: input.amount,
      ...(input.paymentReference.trim()
        ? { paymentReference: input.paymentReference.trim() }
        : {}),
      ...(input.acknowledgeWarnings ? { acknowledgeWarnings: true } : {}),
    }),
    {
      returnTo: returnPath(kind, id),
      forbiddenMessage: `You don't have permission to refund ${info.config.nounPlural}.`,
      successMessage: (saved) =>
        `${info.config.Noun} ${saved.voucherNo} refunded`,
    },
  );
}

/** Cancels a refund voucher: its amount is back on account. */
export async function cancelReturnRefund(
  kind: ReturnKind,
  id: string,
  voucherId: string,
  reason: string,
): Promise<MutationResult> {
  if (!isReturnKind(kind)) {
    return { ok: false, messages: ["Unknown return type."] };
  }
  const info = RETURN_KINDS[kind];
  return runMutation(
    apiSend<Saved>(
      "POST",
      `${info.apiPath}/${encodeURIComponent(id)}/refunds/${encodeURIComponent(voucherId)}/cancel`,
      { reason: reason.trim() },
    ),
    {
      returnTo: returnPath(kind, id),
      forbiddenMessage: "You don't have permission to cancel this refund.",
      successMessage: () => "Refund cancelled",
    },
  );
}
