import { OPENING_STOCK_PATH } from "@/features/stock/constants";
import type { VoucherConfig } from "@/features/vouchers/config";

export { OPENING_STOCK_PATH };
export const OPENING_STOCK_PAGE_SIZE = 20;

/** Audit and comments entity type (backend OPENING_STOCK_ENTITY_TYPE). */
export const OPENING_STOCK_ENTITY_TYPE = "opening-stock";

export function openingStockPath(id: string): string {
  return `${OPENING_STOCK_PATH}/${encodeURIComponent(id)}`;
}

/** Lets the shared voucher view, its cancel dialog and Activity panel show
 * opening stock; the list and form are this feature's own. */
export const OPENING_STOCK_CONFIG: VoucherConfig = {
  basePath: OPENING_STOCK_PATH,
  pdfApiBase: "",
  pdfFilename: "",
  printable: false,
  entityType: OPENING_STOCK_ENTITY_TYPE,
  title: "Opening Stock",
  description:
    "Stock on hand at one location as of a date, carried in from the old system.",
  singular: "Opening Stock",
  noun: "opening stock",
  Noun: "Opening Stock",
  nounPlural: "opening stock vouchers",
  NounPlural: "Opening Stock",
  permissionPrefix: "opening-stock",
  collectorFor: "receipt",
  lineAccountTypes: [],
  showPaymentDetails: false,
  addPartyKind: "customer",
  copy: {
    headerLabel: "Location",
    headerFilterAny: "",
    counterpartyLabel: "Product",
    collectorLabel: "Entered By",
    totalLabel: "Total quantity",
    createButton: "New Opening Stock",
    firstCreateButton: "Enter opening stock",
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
    cancelledNotEditableHint:
      "Enter new opening stock if these quantities still need recording.",
    cancelReasonPlaceholder: "e.g. Counted at the wrong location",
    cancelEffect:
      "Its quantities are taken back out of the location. Refused if that stock was already used.",
  },
};
