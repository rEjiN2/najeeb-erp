import type { VoucherConfig } from "@/features/vouchers/config";
import { MONEY_ACCOUNT_TYPES } from "@/features/vouchers/constants";

export const CASH_HANDOVERS_PATH =
  "/accounting-inventory/transactions/cash-handovers";
export const CASH_HANDOVERS_TITLE = "Cash Handovers";
export const CASH_HANDOVERS_DESCRIPTION =
  "Cash moved between the company's accounts, from one cashier to another.";

/** Entity type under which handovers appear in audit logs and comments. */
export const CASH_HANDOVER_ENTITY_TYPE = "cash-handover";

/** Backend limits (cash-handovers/dto/cash-handover.dto.ts). */
export const HANDOVER_REFERENCE_MAX_LENGTH = 100;
export const HANDOVER_NOTES_MAX_LENGTH = 1000;

export function cashHandoverPath(id: string): string {
  return `${CASH_HANDOVERS_PATH}/${encodeURIComponent(id)}`;
}

/** What makes the shared voucher list and view screens a Cash Handover. */
export const CASH_HANDOVER_CONFIG: VoucherConfig = {
  basePath: CASH_HANDOVERS_PATH,
  pdfApiBase: "/api/cash-handovers",
  pdfFilename: "cash-handover.pdf",
  entityType: CASH_HANDOVER_ENTITY_TYPE,
  title: CASH_HANDOVERS_TITLE,
  description: CASH_HANDOVERS_DESCRIPTION,
  singular: "Cash Handover",
  noun: "handover",
  Noun: "Handover",
  nounPlural: "handovers",
  NounPlural: "Handovers",
  permissionPrefix: "cash-handovers",
  // Both sides are the company's own money accounts (HANDOVER_ACCOUNT_TYPES).
  lineAccountTypes: MONEY_ACCOUNT_TYPES,
  showPaymentDetails: true,
  addPartyKind: "customer",
  simpleLines: true,
  copy: {
    headerLabel: "From Account",
    headerFilterAny: "From account: any",
    counterpartyLabel: "To Account",
    cashierLabel: "Handed By",
    totalLabel: "Total handed over",
    createButton: "New Handover",
    firstCreateButton: "Record your first handover",
    firstRunText:
      "Record cash a cashier hands over — e.g. a van salesman's day's takings paid in at the office. It moves the money between accounts and clears it from their pending cash.",
    emptyMonthText:
      "Nothing has been handed over since the 1st. Earlier handovers are still there.",
    newDescription: "Record cash handed from one cashier to another.",
    editDescription:
      "Saving re-posts the handover with your changes and records them in its activity.",
    // Line picker copy: unused, handovers have their own form.
    addLinePlaceholder: "",
    addLineSearchPlaceholder: "",
    addLineEmpty: "",
    addLineEmptyNoAdd: "",
    linesEmpty: "",
    accountFilterPlaceholder: "All 'to' accounts",
    accountFilterSearchPlaceholder: "Search accounts...",
    accountFilterEmpty: "No matching accounts",
    searchPlaceholder: "Search voucher no, reference or notes...",
    commentsPlaceholder: "Optional notes about this handover",
    headerRequired: "Select the account the money leaves.",
    cashierRequired: "Select the cashier handing the money over.",
    linesRequired: "Select the account the money goes into.",
    inactivePartyHint: "",
    cancelledNotEditableHint:
      "Record a new handover if the cash still needs moving.",
    cancelReasonPlaceholder: "e.g. Entered twice, see CH-0012",
  },
};
