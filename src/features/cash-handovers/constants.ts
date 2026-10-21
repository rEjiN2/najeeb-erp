import type { VoucherConfig } from "@/features/vouchers/config";

import type { HandoverStatus } from "./types";

export const CASH_HANDOVERS_PATH =
  "/accounting-inventory/transactions/cash-handovers";
export const CASH_HANDOVERS_TITLE = "Cash Handovers";
export const CASH_HANDOVERS_DESCRIPTION =
  "Salesmen hand the cash and cheques they hold to the office, which approves them.";

/** Entity type under which handovers appear in audit logs and comments. */
export const CASH_HANDOVER_ENTITY_TYPE = "cash-handover";

/** Backend limits (cash-handovers/dto/cash-handover.dto.ts). */
export const HANDOVER_NOTES_MAX_LENGTH = 1000;
export const HANDOVER_REASON_MAX_LENGTH = 500;
export const HANDOVERS_PAGE_SIZE = 20;

/** Status tabs; "all" sends no status. */
export const HANDOVER_STATUS_TABS = [
  "submitted",
  "approved",
  "rejected",
  "cancelled",
  "all",
] as const satisfies readonly (HandoverStatus | "all")[];

export const HANDOVER_STATUS_LABELS: Record<
  (typeof HANDOVER_STATUS_TABS)[number],
  string
> = {
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  all: "All",
};

export function cashHandoverPath(id: string): string {
  return `${CASH_HANDOVERS_PATH}/${encodeURIComponent(id)}`;
}

/** What makes the shared voucher view (meta strip, PDF, activity, cancel) a
 * Cash Handover. The list and forms are the handover's own. */
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
  // Whoever may collect receipts may hand the money over.
  collectorFor: "receipt",
  lineAccountTypes: [],
  showPaymentDetails: false,
  addPartyKind: "customer",
  copy: {
    headerLabel: "Submitted",
    headerFilterAny: "",
    counterpartyLabel: "Received Into",
    collectorLabel: "Handed By",
    totalLabel: "Total received",
    createButton: "Hand over",
    firstCreateButton: "Hand over",
    firstRunText: "",
    emptyMonthText: "",
    newDescription: "",
    editDescription: "",
    addLinePlaceholder: "",
    addLineSearchPlaceholder: "",
    addLineEmpty: "",
    addLineEmptyNoAdd: "",
    linesEmpty: "",
    accountFilterPlaceholder: "",
    accountFilterSearchPlaceholder: "",
    accountFilterEmpty: "",
    searchPlaceholder: "",
    commentsPlaceholder: "",
    headerRequired: "",
    collectorRequired: "",
    linesRequired: "",
    inactivePartyHint: "",
    cancelledNotEditableHint: "",
    cancelReasonPlaceholder: "e.g. Submitted twice, see HO-0012",
  },
};
