"use server";

import { salesInvoicePath } from "@/features/sales-invoices/constants";
import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { PURCHASE_INVOICES_PATH, purchaseInvoicePath } from "./constants";
import type { PurchaseInvoiceInput } from "./types";

// Server Actions are public endpoints: the backend checks the
// purchase-invoices permissions, prices every line and refuses a duplicate
// bill number or an edit/cancel whose stock was already used. Its messages
// are shown as they are.

interface Saved {
  _id: string;
  voucherNo: string;
}

const FORBIDDEN =
  "You don't have permission to do that with purchase invoices.";

function toBody(input: PurchaseInvoiceInput) {
  return {
    date: input.date,
    supplierId: input.supplierId,
    locationId: input.locationId,
    billNo: input.billNo.trim(),
    billDate: input.billDate || null,
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    remarks: input.remarks.trim() || null,
    attachmentFileRefs: input.attachmentFileRefs,
    updatePurchasePrice: input.updatePurchasePrice,
    lines: input.lines,
  };
}

export async function createPurchaseInvoice(
  input: PurchaseInvoiceInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", "/purchase-invoices", toBody(input)),
    {
      returnTo: `${PURCHASE_INVOICES_PATH}/new`,
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Purchase invoice ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

export async function updatePurchaseInvoice(
  id: string,
  input: PurchaseInvoiceInput,
  changeNote: string,
): Promise<MutationResult> {
  const note = changeNote.trim();
  return runMutation(
    apiSend<Saved>("PATCH", `/purchase-invoices/${encodeURIComponent(id)}`, {
      ...toBody(input),
      ...(note ? { changeNote: note } : {}),
    }),
    {
      returnTo: purchaseInvoicePath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Purchase invoice ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

/** Reverses stock and the supplier's balance; the invoice stays, marked cancelled. */
export async function cancelPurchaseInvoice(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>(
      "POST",
      `/purchase-invoices/${encodeURIComponent(id)}/cancel`,
      { reason: reason.trim() },
    ),
    {
      returnTo: purchaseInvoicePath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) =>
        `Purchase invoice ${saved.voucherNo} cancelled`,
    },
  );
}

const ALLOCATION_FORBIDDEN =
  "You don't have permission to apply or reverse payments.";

/** A bill payments can be applied to: purchase or sales invoice. */
export type InvoiceTargetType = "purchase-invoice" | "sales-invoice";

function invoicePath(targetType: InvoiceTargetType, id: string): string {
  return targetType === "sales-invoice"
    ? salesInvoicePath(id)
    : purchaseInvoicePath(id);
}

/** Applies part of an existing on-account payment (or receipt) line to this invoice. */
export async function applyPaymentToInvoice(
  invoiceId: string,
  payment: {
    paymentVoucherType: string;
    paymentVoucherId: string;
    paymentLineIndex: number;
  },
  amount: number,
  targetType: InvoiceTargetType = "purchase-invoice",
): Promise<MutationResult> {
  return runMutation(
    apiSend<{ paymentVoucherNo: string }>("POST", "/allocations", {
      ...payment,
      targetType,
      targetId: invoiceId,
      amount,
    }),
    {
      returnTo: invoicePath(targetType, invoiceId),
      forbiddenMessage: ALLOCATION_FORBIDDEN,
      successMessage: (saved) => `${saved.paymentVoucherNo} applied`,
    },
  );
}

/** Takes an allocation back off the invoice; the payment's money goes back on account. */
export async function reverseInvoiceAllocation(
  invoiceId: string,
  allocationId: string,
  reason: string,
  targetType: InvoiceTargetType = "purchase-invoice",
): Promise<MutationResult> {
  return runMutation(
    apiSend<{ paymentVoucherNo: string }>(
      "POST",
      `/allocations/${encodeURIComponent(allocationId)}/reverse`,
      { reason: reason.trim() },
    ),
    {
      returnTo: invoicePath(targetType, invoiceId),
      forbiddenMessage: ALLOCATION_FORBIDDEN,
      successMessage: (saved) =>
        `Allocation from ${saved.paymentVoucherNo} reversed`,
    },
  );
}
