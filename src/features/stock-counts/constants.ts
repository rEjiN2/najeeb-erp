import type { VoucherConfig } from "@/features/vouchers/config";

export const STOCK_COUNTS_PATH = "/accounting-inventory/inventory/stock-counts";
export const STOCK_COUNTS_PAGE_SIZE = 20;

/** Audit and comments entity type (backend STOCK_COUNT_ENTITY_TYPE). */
export const STOCK_COUNT_ENTITY_TYPE = "stock-count";

export function stockCountPath(id: string): string {
  return `${STOCK_COUNTS_PATH}/${encodeURIComponent(id)}`;
}

export type StockCountStatus =
  "draft" | "submitted" | "approved" | "rejected" | "cancelled";

export const STOCK_COUNT_STATUS_LABELS: Record<StockCountStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** Lets the shared cancel dialog and PDF hook serve stock counts; the list,
 * form and view are this feature's own. */
export const STOCK_COUNT_CONFIG: VoucherConfig = {
  basePath: STOCK_COUNTS_PATH,
  pdfApiBase: "/api/stock-counts",
  pdfFilename: "stock-count.pdf",
  entityType: STOCK_COUNT_ENTITY_TYPE,
  title: "Stock Counts",
  description:
    "Count a location's stock, then have it approved to correct the quantities.",
  singular: "Stock Count",
  noun: "stock count",
  Noun: "Stock Count",
  nounPlural: "stock counts",
  NounPlural: "Stock Counts",
  permissionPrefix: "stock-counts",
  collectorFor: "receipt",
  lineAccountTypes: [],
  showPaymentDetails: false,
  addPartyKind: "customer",
  copy: {
    headerLabel: "Location",
    headerFilterAny: "",
    counterpartyLabel: "Product",
    collectorLabel: "Counted By",
    totalLabel: "",
    createButton: "New Stock Count",
    firstCreateButton: "Start a count",
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
    linesRequired: "Add at least one product.",
    inactivePartyHint: "",
    cancelledNotEditableHint: "",
    cancelReasonPlaceholder: "e.g. Counted at the wrong location",
    cancelEffect:
      "If it was approved, its stock corrections are reversed (refused if that would make stock negative).",
  },
};
