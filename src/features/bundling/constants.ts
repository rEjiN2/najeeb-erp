import type { VoucherConfig } from "@/features/vouchers/config";

export const BUNDLING_PATH = "/accounting-inventory/transactions/bundling";
export const BUNDLING_PAGE_SIZE = 20;

/** Audit and comments entity type (backend BUNDLING_ENTITY_TYPE). */
export const BUNDLING_ENTITY_TYPE = "bundling";

export type BundlingMode = "bundle" | "unbundle";

export const BUNDLING_MODE_LABELS: Record<BundlingMode, string> = {
  bundle: "Bundle",
  unbundle: "Unbundle",
};

export function bundlingPath(id: string): string {
  return `${BUNDLING_PATH}/${encodeURIComponent(id)}`;
}

/** Lets the shared voucher view, cancel dialog and Activity panel show a
 * bundling; the list and form are this feature's own. */
export const BUNDLING_CONFIG: VoucherConfig = {
  basePath: BUNDLING_PATH,
  pdfApiBase: "/api/bundlings",
  pdfFilename: "bundling.pdf",
  entityType: BUNDLING_ENTITY_TYPE,
  title: "Bundling",
  description:
    "Pack parts into bundles (or break bundles back into parts) at a location.",
  singular: "Bundling",
  noun: "bundling",
  Noun: "Bundling",
  nounPlural: "bundlings",
  NounPlural: "Bundlings",
  permissionPrefix: "bundling",
  collectorFor: "receipt",
  lineAccountTypes: [],
  showPaymentDetails: false,
  addPartyKind: "customer",
  copy: {
    headerLabel: "Location",
    headerFilterAny: "",
    counterpartyLabel: "Product",
    collectorLabel: "Created By",
    totalLabel: "",
    createButton: "New Bundling",
    firstCreateButton: "Pack bundles",
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
    cancelReasonPlaceholder: "e.g. Packed the wrong box",
    cancelEffect:
      "Undoes it: the parts and the bundles are put back as they were. Refused if the bundles were already sold or used.",
  },
};
