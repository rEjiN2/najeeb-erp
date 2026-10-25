import type { VoucherConfig } from "@/features/vouchers/config";

export const PURCHASE_INVOICES_PATH =
  "/accounting-inventory/transactions/purchase-invoices";
export const PURCHASE_INVOICES_PAGE_SIZE = 20;

/** Audit and comments entity type (backend PURCHASE_INVOICE_ENTITY_TYPE). */
export const PURCHASE_INVOICE_ENTITY_TYPE = "purchase-invoice";

export function purchaseInvoicePath(id: string): string {
  return `${PURCHASE_INVOICES_PATH}/${encodeURIComponent(id)}`;
}

/** Lets the shared voucher view, its cancel dialog, PDF and Activity panel
 * show purchase invoices; the list and form are this feature's own. */
export const PURCHASE_INVOICE_CONFIG: VoucherConfig = {
  basePath: PURCHASE_INVOICES_PATH,
  pdfApiBase: "/api/purchase-invoices",
  pdfFilename: "purchase-invoice.pdf",
  entityType: PURCHASE_INVOICE_ENTITY_TYPE,
  title: "Purchase Invoices",
  description: "Supplier bills: stock in at a location, owed to the supplier.",
  singular: "Purchase Invoice",
  noun: "purchase invoice",
  Noun: "Purchase Invoice",
  nounPlural: "purchase invoices",
  NounPlural: "Purchase Invoices",
  permissionPrefix: "purchase-invoices",
  collectorFor: "payment",
  lineAccountTypes: [],
  showPaymentDetails: false,
  addPartyKind: "supplier",
  copy: {
    headerLabel: "Supplier",
    headerFilterAny: "",
    counterpartyLabel: "Product",
    collectorLabel: "Entered By",
    totalLabel: "Net total",
    createButton: "New Purchase Invoice",
    firstCreateButton: "Enter a purchase",
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
    inactivePartyHint: "Purchases need an active supplier.",
    cancelledNotEditableHint:
      "Enter a new purchase invoice if the bill still needs recording.",
    cancelReasonPlaceholder: "e.g. Entered against the wrong supplier",
    cancelEffect:
      "The stock is taken back out of the location and the supplier no longer owes the total. Refused if that stock was already used.",
  },
};
