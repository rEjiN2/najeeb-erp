import { PURCHASE_INVOICES_PATH } from "@/features/purchase-invoices/constants";
import { SALES_INVOICES_PATH } from "@/features/sales-invoices/constants";
import type { VoucherConfig } from "@/features/vouchers/config";

import type { ReturnKind } from "./types";

export const RETURNS_PAGE_SIZE = 20;

export interface ReturnKindInfo {
  path: string;
  /** Backend routes. */
  apiPath: string;
  invoiceApiPath: string;
  /** The invoice view pages. */
  invoicesPath: string;
  invoiceLabel: string;
  partyLabel: string;
  /** "Sold" | "Bought" column heading. */
  movedLabel: string;
  /** Sales only: goods can go back or stay out of stock. */
  restock: boolean;
  /** Where the goods go back to / come out of. */
  locationLabel: string;
  config: VoucherConfig;
}

/** What the shared voucher view, cancel dialog, PDF and Activity panel show;
 * the list and form are this feature's own. */
function voucherConfig(
  kind: ReturnKind,
  noun: string,
  Noun: string,
  partyLabel: string,
  basePath: string,
  cancelEffect: string,
): VoucherConfig {
  return {
    basePath,
    pdfApiBase: `/api/${kind}-returns`,
    pdfFilename: `${kind}-return.pdf`,
    entityType: `${kind}-return`,
    title: `${Noun}s`,
    description:
      kind === "sales"
        ? "Goods customers send back: the credit note reduces what they owe."
        : "Goods sent back to suppliers: the debit note reduces what you owe.",
    singular: Noun,
    noun,
    Noun,
    nounPlural: `${noun}s`,
    NounPlural: `${Noun}s`,
    permissionPrefix: `${kind}-returns`,
    collectorFor: kind === "sales" ? "receipt" : "payment",
    lineAccountTypes: [],
    showPaymentDetails: false,
    addPartyKind: kind === "sales" ? "customer" : "supplier",
    copy: {
      headerLabel: partyLabel,
      headerFilterAny: "",
      counterpartyLabel: "Product",
      collectorLabel: "Created By",
      totalLabel: "Net total",
      createButton: `New ${Noun}`,
      firstCreateButton: `Make a ${noun}`,
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
      linesRequired: "Enter a quantity on at least one line.",
      inactivePartyHint: "",
      cancelledNotEditableHint: "",
      cancelReasonPlaceholder: "e.g. Returned against the wrong invoice",
      cancelEffect,
    },
  };
}

const SALES_PATH = "/accounting-inventory/transactions/sales-returns";
const PURCHASE_PATH = "/accounting-inventory/transactions/purchase-returns";

export const RETURN_KINDS: Record<ReturnKind, ReturnKindInfo> = {
  sales: {
    path: SALES_PATH,
    apiPath: "/sales-returns",
    invoiceApiPath: "/sales-invoices",
    invoicesPath: SALES_INVOICES_PATH,
    invoiceLabel: "Sales invoice",
    partyLabel: "Customer",
    movedLabel: "Sold",
    restock: true,
    locationLabel: "Return location",
    config: voucherConfig(
      "sales",
      "sales return",
      "Sales Return",
      "Customer",
      SALES_PATH,
      "The invoice owes the credit again and the restocked goods leave the location. Refused if that stock was since used or the credit was applied elsewhere.",
    ),
  },
  purchase: {
    path: PURCHASE_PATH,
    apiPath: "/purchase-returns",
    invoiceApiPath: "/purchase-invoices",
    invoicesPath: PURCHASE_INVOICES_PATH,
    invoiceLabel: "Purchase invoice",
    partyLabel: "Supplier",
    movedLabel: "Bought",
    restock: false,
    locationLabel: "Return from location",
    config: voucherConfig(
      "purchase",
      "purchase return",
      "Purchase Return",
      "Supplier",
      PURCHASE_PATH,
      "The goods come back into the location and the invoice owes the supplier again. Refused if the credit was applied elsewhere.",
    ),
  },
};

export function isReturnKind(value: string): value is ReturnKind {
  return value === "sales" || value === "purchase";
}

export function returnPath(kind: ReturnKind, id: string): string {
  return `${RETURN_KINDS[kind].path}/${encodeURIComponent(id)}`;
}

/** The new-return form for an invoice. */
export function newReturnPath(kind: ReturnKind, invoiceId: string): string {
  return `${RETURN_KINDS[kind].path}/new?${new URLSearchParams({ invoice: invoiceId })}`;
}
