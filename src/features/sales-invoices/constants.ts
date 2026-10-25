import type { VoucherConfig } from "@/features/vouchers/config";

export const SALES_INVOICES_PATH =
  "/accounting-inventory/transactions/sales-invoices";
export const SALES_INVOICES_PAGE_SIZE = 20;

/** Audit and comments entity type (backend SALES_INVOICE_ENTITY_TYPE). */
export const SALES_INVOICE_ENTITY_TYPE = "sales-invoice";

export function salesInvoicePath(id: string): string {
  return `${SALES_INVOICES_PATH}/${encodeURIComponent(id)}`;
}

/** Lets the shared voucher view, its cancel dialog, PDF and Activity panel
 * show sales invoices; the list and form are this feature's own. */
export const SALES_INVOICE_CONFIG: VoucherConfig = {
  basePath: SALES_INVOICES_PATH,
  pdfApiBase: "/api/sales-invoices",
  pdfFilename: "sales-invoice.pdf",
  entityType: SALES_INVOICE_ENTITY_TYPE,
  title: "Sales Invoices",
  description: "Sales to customers: stock out of a location, owed or paid.",
  singular: "Sales Invoice",
  noun: "sales invoice",
  Noun: "Sales Invoice",
  nounPlural: "sales invoices",
  NounPlural: "Sales Invoices",
  permissionPrefix: "sales-invoices",
  collectorFor: "receipt",
  lineAccountTypes: [],
  showPaymentDetails: false,
  addPartyKind: "customer",
  copy: {
    headerLabel: "Customer",
    headerFilterAny: "",
    counterpartyLabel: "Product",
    collectorLabel: "Sold By",
    totalLabel: "Net total",
    createButton: "New Sales Invoice",
    firstCreateButton: "Make a sale",
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
    inactivePartyHint: "Sales need an active customer.",
    cancelledNotEditableHint:
      "Enter a new sales invoice if the sale still needs recording.",
    cancelReasonPlaceholder: "e.g. Entered against the wrong customer",
    cancelEffect:
      "The stock goes back into the location and the customer no longer owes the total. A payment taken at the sale is cancelled too; refused if it was already handed over.",
  },
};
