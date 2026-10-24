import type { VoucherConfig } from "@/features/vouchers/config";

export const OPENING_BALANCES_PATH =
  "/accounting-inventory/transactions/opening-balances";
export const OPENING_BALANCES_PAGE_SIZE = 20;

/** Audit and comments entity type (backend OPENING_BALANCE_ENTITY_TYPE). */
export const OPENING_BALANCE_ENTITY_TYPE = "opening-balance";

/** Accounts that can take an opening balance (backend OPENING_ACCOUNT_TYPES):
 * no cheque accounts; pending cheques are entered as cheque receipts. */
export const OPENING_ACCOUNT_TYPES = [
  "cash",
  "wallet",
  "bank",
  "party",
  "supplier",
  "expense",
  "income",
  "other",
] as const;

/** The side a new line starts on; the user can switch it. */
export function defaultSide(type: string | null): "debit" | "credit" {
  return type === "supplier" || type === "income" ? "credit" : "debit";
}

export function openingBalancePath(id: string): string {
  return `${OPENING_BALANCES_PATH}/${encodeURIComponent(id)}`;
}

/** Lets the shared voucher view, its cancel dialog and Activity panel show
 * an opening balance; the list and form are this feature's own. */
export const OPENING_BALANCE_CONFIG: VoucherConfig = {
  basePath: OPENING_BALANCES_PATH,
  pdfApiBase: "",
  pdfFilename: "",
  printable: false,
  entityType: OPENING_BALANCE_ENTITY_TYPE,
  title: "Opening Balances",
  description:
    "Balances carried in from the old system, as of a date. The difference goes to Opening Balance Equity.",
  singular: "Opening Balance",
  noun: "opening balance",
  Noun: "Opening Balance",
  nounPlural: "opening balances",
  NounPlural: "Opening Balances",
  permissionPrefix: "opening-balances",
  collectorFor: "receipt",
  lineAccountTypes: OPENING_ACCOUNT_TYPES,
  showPaymentDetails: false,
  addPartyKind: "customer",
  copy: {
    headerLabel: "Balancing entry",
    headerFilterAny: "",
    counterpartyLabel: "Account",
    collectorLabel: "Entered By",
    totalLabel: "Total debit",
    createButton: "New Opening Balance",
    firstCreateButton: "Enter opening balances",
    firstRunText: "",
    emptyMonthText: "",
    newDescription: "",
    editDescription: "",
    addLinePlaceholder: "",
    addLineSearchPlaceholder: "",
    addLineEmpty: "",
    addLineEmptyNoAdd: "",
    linesEmpty: "",
    accountFilterPlaceholder: "All accounts",
    accountFilterSearchPlaceholder: "Search accounts...",
    accountFilterEmpty: "No matching accounts",
    searchPlaceholder: "",
    commentsPlaceholder: "",
    headerRequired: "",
    collectorRequired: "",
    linesRequired: "Add at least one account.",
    inactivePartyHint: "",
    cancelledNotEditableHint:
      "Enter a new opening balance if these balances still need recording.",
    cancelReasonPlaceholder: "e.g. Entered against the wrong date",
  },
};
