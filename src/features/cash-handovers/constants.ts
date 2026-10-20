import type { VoucherConfig } from "@/features/vouchers/config";
import { MONEY_ACCOUNT_TYPES } from "@/features/vouchers/constants";

export const CASH_HANDOVERS_PATH =
  "/accounting-inventory/transactions/cash-handovers";
export const CASH_HANDOVERS_TITLE = "Cash Handovers";
export const CASH_HANDOVERS_DESCRIPTION =
  "Staff hand the cash they collected over to the office, which approves it.";

/** Entity type under which handovers appear in audit logs and comments. */
export const CASH_HANDOVER_ENTITY_TYPE = "cash-handover";

/** Backend limits (cash-handovers/dto/cash-handover.dto.ts). */
export const HANDOVER_NOTES_MAX_LENGTH = 1000;
/** Accounts the van's cash can come from (HANDOVER_SOURCE_ACCOUNT_TYPES). */
export const HANDOVER_SOURCE_ACCOUNT_TYPES = ["cash", "wallet"];

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
  // The receiving side is one of the company's money accounts.
  lineAccountTypes: MONEY_ACCOUNT_TYPES,
  showPaymentDetails: false,
  addPartyKind: "customer",
  simpleLines: true,
  statusFilters: ["all", "submitted", "approved", "rejected", "cancelled"],
  copy: {
    headerLabel: "Source Account",
    headerFilterAny: "Source account: any",
    counterpartyLabel: "Received Into",
    cashierLabel: "Handed By",
    totalLabel: "Total expected cash",
    createButton: "Submit Handover",
    firstCreateButton: "Submit your first handover",
    firstRunText:
      "Staff who settle with the office hand over the receipts they collected. The office checks the cash and approves it.",
    emptyMonthText:
      "Nothing has been handed over since the 1st. Earlier handovers are still there.",
    newDescription:
      "Pick the receipts you're settling and count the cash you're handing over.",
    editDescription: "",
    // Line picker copy: unused, handovers have their own form.
    addLinePlaceholder: "",
    addLineSearchPlaceholder: "",
    addLineEmpty: "",
    addLineEmptyNoAdd: "",
    linesEmpty: "",
    accountFilterPlaceholder: "Received into: any",
    accountFilterSearchPlaceholder: "Search accounts...",
    accountFilterEmpty: "No matching accounts",
    searchPlaceholder: "Search voucher no or notes...",
    commentsPlaceholder: "Optional notes about this handover",
    headerRequired: "Select the account the cash was received into.",
    cashierRequired: "Select who is handing over.",
    linesRequired: "Select at least one receipt.",
    inactivePartyHint: "",
    cancelledNotEditableHint:
      "Submit a new handover if the cash still needs settling.",
    cancelReasonPlaceholder: "e.g. Submitted twice, see CH-0012",
  },
};
