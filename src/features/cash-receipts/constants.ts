import type { VoucherConfig } from "@/features/vouchers/config";

export const CASH_RECEIPTS_PATH =
  "/accounting-inventory/transactions/cash-receipts";
export const CASH_RECEIPTS_TITLE = "Receipts";
export const CASH_RECEIPTS_DESCRIPTION =
  "Cash, cheques and transfers received against party accounts.";

/** Entity type under which receipts appear in audit logs and comments. */
export const CASH_RECEIPT_ENTITY_TYPE = "cash-receipt";

/** Account types a receipt's lines (and the "Account / party" filter) pick
 * from — the backend's RECEIPT_LINE_ACCOUNT_TYPES. */
export const LINE_ACCOUNT_TYPES = [
  "party",
  "income",
  "expense",
  "other",
] as const;

export function cashReceiptPath(id: string): string {
  return `${CASH_RECEIPTS_PATH}/${encodeURIComponent(id)}`;
}

export function editCashReceiptPath(id: string): string {
  return `${cashReceiptPath(id)}/edit`;
}

export const NEW_CASH_RECEIPT_PATH = `${CASH_RECEIPTS_PATH}/new`;

/** What makes the shared voucher screens a Cash Receipt. */
export const CASH_RECEIPT_CONFIG: VoucherConfig = {
  basePath: CASH_RECEIPTS_PATH,
  pdfApiBase: "/api/cash-receipts",
  pdfFilename: "cash-receipt.pdf",
  entityType: CASH_RECEIPT_ENTITY_TYPE,
  title: CASH_RECEIPTS_TITLE,
  description: CASH_RECEIPTS_DESCRIPTION,
  singular: "Receipt",
  noun: "receipt",
  Noun: "Receipt",
  nounPlural: "receipts",
  NounPlural: "Receipts",
  permissionPrefix: "cash-receipts",
  collectorFor: "receipt",
  lineAccountTypes: LINE_ACCOUNT_TYPES,
  showPaymentDetails: false,
  methodSelector: true,
  addPartyKind: "customer",
  allocatesBills: true,
  copy: {
    headerLabel: "Received Into",
    headerFilterAny: "Received into: any",
    counterpartyLabel: "Received From",
    collectorLabel: "Collected By",
    totalLabel: "Total received",
    createButton: "Create Receipt",
    firstCreateButton: "Create your first receipt",
    firstRunText:
      "Record cash collected from customers. Each receipt posts to a cash, wallet or bank account and the parties it was received from.",
    emptyMonthText:
      "Nothing has been received since the 1st. Earlier receipts are still there.",
    newDescription: "Record cash received against one or more party accounts.",
    editDescription:
      "Saving re-posts the receipt with your changes and records them in its activity.",
    addLinePlaceholder: "+ Add a party to receive from",
    addLineSearchPlaceholder: "Search parties by name or code...",
    addLineEmpty: "No matching parties. Add a customer",
    addLineEmptyNoAdd:
      "No matching parties. Ask someone who manages customers to add it.",
    linesEmpty: "No lines yet — add the party you received cash from below.",
    accountFilterPlaceholder: "All accounts / parties",
    accountFilterSearchPlaceholder: "Search parties...",
    accountFilterEmpty: "No matching parties",
    searchPlaceholder: "Search voucher no, comments or narration...",
    commentsPlaceholder: "Optional notes about this receipt",
    headerRequired: "Select the account the money was received into.",
    collectorRequired: "Select who collected the cash.",
    linesRequired: "Add at least one account to receive from.",
    inactivePartyHint: "Reactivate it under Customers to receive from it.",
    cancelledNotEditableHint:
      "Create a new receipt if the cash still needs recording.",
    cancelReasonPlaceholder: "e.g. Duplicate of CR000123",
  },
};
