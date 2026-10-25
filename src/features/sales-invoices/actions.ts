"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { SALES_INVOICES_PATH, salesInvoicePath } from "./constants";
import type { SalesInvoiceInput } from "./types";

// Server Actions are public endpoints: the backend checks the sales-invoices
// permissions, prices every line, checks stock and the credit limit. Its
// messages are shown as they are (a 409 asking for acknowledgeCredit opens
// the form's credit warning).

interface Saved {
  _id: string;
  voucherNo: string;
}

const FORBIDDEN = "You don't have permission to do that with sales invoices.";

function toBody(input: SalesInvoiceInput, withPayment: boolean) {
  const pay = input.payNow;
  return {
    date: input.date,
    customerId: input.customerId,
    locationId: input.locationId,
    soldById: input.soldById,
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    remarks: input.remarks.trim() || null,
    lines: input.lines,
    ...(withPayment && pay && pay.amount > 0
      ? {
          payNow: {
            method: pay.method,
            amount: pay.amount,
            ...(pay.accountId ? { accountId: pay.accountId } : {}),
            ...(pay.method === "cheque"
              ? {
                  chequeNumber: pay.chequeNumber.trim(),
                  chequeDate: pay.chequeDate,
                  ...(pay.chequeBankName.trim()
                    ? { chequeBankName: pay.chequeBankName.trim() }
                    : {}),
                }
              : {}),
            ...(pay.method === "bank" && pay.paymentReference.trim()
              ? { paymentReference: pay.paymentReference.trim() }
              : {}),
          },
        }
      : {}),
    ...(input.acknowledgeCredit ? { acknowledgeCredit: true } : {}),
  };
}

export async function createSalesInvoice(
  input: SalesInvoiceInput,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", "/sales-invoices", toBody(input, true)),
    {
      returnTo: `${SALES_INVOICES_PATH}/new`,
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Sales invoice ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

/** Payment is never taken on an edit: record a receipt instead. */
export async function updateSalesInvoice(
  id: string,
  input: SalesInvoiceInput,
  changeNote: string,
): Promise<MutationResult> {
  const note = changeNote.trim();
  return runMutation(
    apiSend<Saved>("PATCH", `/sales-invoices/${encodeURIComponent(id)}`, {
      ...toBody(input, false),
      ...(note ? { changeNote: note } : {}),
    }),
    {
      returnTo: salesInvoicePath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Sales invoice ${saved.voucherNo} saved`,
      getId: (saved) => saved._id,
    },
  );
}

/** Puts the stock back and cancels the payment taken at the sale. */
export async function cancelSalesInvoice(
  id: string,
  reason: string,
): Promise<MutationResult> {
  return runMutation(
    apiSend<Saved>("POST", `/sales-invoices/${encodeURIComponent(id)}/cancel`, {
      reason: reason.trim(),
    }),
    {
      returnTo: salesInvoicePath(id),
      forbiddenMessage: FORBIDDEN,
      successMessage: (saved) => `Sales invoice ${saved.voucherNo} cancelled`,
    },
  );
}
