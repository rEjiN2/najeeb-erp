import type { VoucherConfig } from "@/features/vouchers/config";

export const CASH_PAYMENTS_PATH =
  "/accounting-inventory/transactions/cash-payments";
export const CASH_PAYMENTS_TITLE = "Cash Payments";
export const CASH_PAYMENTS_DESCRIPTION =
  "Cash or bank money paid out to suppliers, customers and expenses.";

/** Entity type under which payments appear in audit logs and comments. */
export const CASH_PAYMENT_ENTITY_TYPE = "cash-payment";

/** Account types a payment's lines (and the "Account / party" filter) pick
 * from. Never the company's own cash, wallet or bank accounts: that would be
 * a transfer, not a payment. */
export const PAYMENT_LINE_ACCOUNT_TYPES = [
  "supplier",
  "party",
  "expense",
  "other",
] as const;

export function cashPaymentPath(id: string): string {
  return `${CASH_PAYMENTS_PATH}/${encodeURIComponent(id)}`;
}

/** What makes the shared voucher screens a Cash Payment. */
export const CASH_PAYMENT_CONFIG: VoucherConfig = {
  basePath: CASH_PAYMENTS_PATH,
  pdfApiBase: "/api/cash-payments",
  pdfFilename: "cash-payment.pdf",
  entityType: CASH_PAYMENT_ENTITY_TYPE,
  title: CASH_PAYMENTS_TITLE,
  description: CASH_PAYMENTS_DESCRIPTION,
  singular: "Cash Payment",
  noun: "payment",
  Noun: "Payment",
  nounPlural: "payments",
  NounPlural: "Payments",
  permissionPrefix: "cash-payments",
  lineAccountTypes: PAYMENT_LINE_ACCOUNT_TYPES,
  showPaymentDetails: true,
  addPartyKind: "supplier",
  copy: {
    headerLabel: "Paid From",
    headerFilterAny: "Paid from: any",
    counterpartyLabel: "Paid To",
    totalLabel: "Total paid",
    createButton: "Create Payment",
    firstCreateButton: "Create your first payment",
    firstRunText:
      "Record money paid to suppliers, customers or expenses. Each payment posts from a cash, wallet or bank account to the accounts it was paid to.",
    emptyMonthText:
      "Nothing has been paid out since the 1st. Earlier payments are still there.",
    newDescription:
      "Record money paid out to one or more suppliers, customers or expense accounts.",
    editDescription:
      "Saving re-posts the payment with your changes and records them in its activity.",
    addLinePlaceholder: "+ Add an account to pay",
    addLineSearchPlaceholder: "Search suppliers, customers or expenses...",
    addLineEmpty: "No matching accounts. Add a supplier",
    addLineEmptyNoAdd:
      "No matching accounts. Ask someone who manages suppliers to add it.",
    linesEmpty: "No lines yet — add the account you paid below.",
    accountFilterPlaceholder: "All accounts / parties",
    accountFilterSearchPlaceholder: "Search suppliers, customers...",
    accountFilterEmpty: "No matching accounts",
    searchPlaceholder: "Search voucher no, reference, comments or narration...",
    commentsPlaceholder: "Optional notes about this payment",
    headerRequired: "Select the account the money was paid from.",
    cashierRequired: "Select the cashier who paid out the money.",
    linesRequired: "Add at least one account to pay to.",
    inactivePartyHint: "Reactivate it under Suppliers to pay it.",
    cancelledNotEditableHint:
      "Create a new payment if the money still needs recording.",
    cancelReasonPlaceholder: "e.g. Duplicate of CP-0012",
  },
};
