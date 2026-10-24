import type { PartyKind } from "@/features/parties/types";

import type { StatusFilter } from "./filters";

/**
 * Everything that differs between cash/bank voucher screens — the list,
 * form, view and dialogs are shared. Plain data only, so a server page can
 * hand it straight to the client components.
 */
export interface VoucherConfig {
  /** e.g. "/accounting-inventory/transactions/cash-receipts". */
  basePath: string;
  /** Same-origin route handler base for the PDF, e.g. "/api/cash-receipts". */
  pdfApiBase: string;
  /** Fallback PDF filename when the backend sends none. */
  pdfFilename: string;
  /** Entity type in audit logs, comments and the activity timeline. */
  entityType: string;

  /** Plural title, e.g. "Cash Receipts". */
  title: string;
  description: string;
  /** Title-case singular, e.g. "Cash Receipt". */
  singular: string;
  /** Lowercase noun for sentences, e.g. "receipt". */
  noun: string;
  /** Title-case noun for buttons, e.g. "Receipt". */
  Noun: string;
  /** Lowercase plural, e.g. "receipts". */
  nounPlural: string;
  /** Title-case plural, e.g. "Receipts". */
  NounPlural: string;
  /** Backend permission prefix, e.g. "cash-receipts" (→ cash-receipts:create). */
  permissionPrefix: string;
  /** Collected By / Paid By picker: GET /users/lookup?for=<this>. */
  collectorFor: "receipt" | "payment";

  /** Account types the lines (and the "Account / party" filter) pick from. */
  lineAccountTypes: readonly string[];
  /** Payments: show the payment reference field and the Method filter/column. */
  showPaymentDetails: boolean;
  /** Receipts: a Payment Method selector on the form (it filters the header
   * accounts) and All / Cash / Cheque / Bank tabs on the list. */
  methodSelector?: boolean;
  /** Which party master the line picker's "Add …" opens. */
  addPartyKind: PartyKind;
  /** One account and amount per voucher (handovers): the view leaves out
   * narration, remarks, VAT and the gross/tax totals. */
  simpleLines?: boolean;
  /** false: no PDF (opening balances), so no Print / Download buttons. */
  printable?: boolean;
  /** Status filter choices; receipts and payments: all / posted / cancelled.
   * When set, the list shows them as tabs. */
  statusFilters?: readonly StatusFilter[];

  copy: {
    /** "Received Into" / "Paid From". */
    headerLabel: string;
    /** "Received into: any". */
    headerFilterAny: string;
    /** "Received From" / "Paid To". */
    counterpartyLabel: string;
    /** "Collected By" / "Paid By". */
    collectorLabel: string;
    /** List summary label, e.g. "Total received". */
    totalLabel: string;
    createButton: string;
    firstCreateButton: string;
    firstRunText: string;
    /** "Nothing has been received since the 1st. ..." */
    emptyMonthText: string;
    newDescription: string;
    editDescription: string;
    addLinePlaceholder: string;
    addLineSearchPlaceholder: string;
    /** Shown when the line search finds nothing, with and without "Add …". */
    addLineEmpty: string;
    addLineEmptyNoAdd: string;
    linesEmpty: string;
    accountFilterPlaceholder: string;
    accountFilterSearchPlaceholder: string;
    accountFilterEmpty: string;
    searchPlaceholder: string;
    commentsPlaceholder: string;
    headerRequired: string;
    collectorRequired: string;
    linesRequired: string;
    /** Inactive party saved from the side panel. */
    inactivePartyHint: string;
    /** "...Create a new receipt if the cash still needs recording." */
    cancelledNotEditableHint: string;
    cancelReasonPlaceholder: string;
    /** Cancel dialog: what is reversed. Default: the amount on both accounts. */
    cancelEffect?: string;
  };
}

export function voucherPath(config: VoucherConfig, id: string): string {
  return `${config.basePath}/${encodeURIComponent(id)}`;
}

export function editVoucherPath(config: VoucherConfig, id: string): string {
  return `${voucherPath(config, id)}/edit`;
}

export function newVoucherPath(config: VoucherConfig): string {
  return `${config.basePath}/new`;
}

export function voucherPdfUrl(
  config: VoucherConfig,
  id: string,
  download = false,
): string {
  return `${config.pdfApiBase}/${encodeURIComponent(id)}/pdf${download ? "?download=1" : ""}`;
}

/** What the signed-in user may do with a voucher type. Reading is implied:
 * without it the list and view pages are refused by the backend (403). */
export interface VoucherAccess {
  canCreate: boolean;
  canEdit: boolean;
  canCancel: boolean;
  /** balances:view — the backend leaves balances out without it. */
  canViewBalances: boolean;
}
