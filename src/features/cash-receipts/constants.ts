export const CASH_RECEIPTS_PATH =
  "/accounting-inventory/transactions/cash-receipts";
export const CASH_RECEIPTS_TITLE = "Cash Receipts";
export const CASH_RECEIPTS_DESCRIPTION =
  "Cash received against one or more party accounts.";

/** Entity type under which receipts appear in audit logs and comments. */
export const CASH_RECEIPT_ENTITY_TYPE = "cash-receipt";

/** Needed for create, edit and cancel; reading and commenting need none. */
export const CASH_RECEIPTS_MANAGE_PERMISSION = "cash-receipts:manage";

/** Account types the Cash Account picker offers. */
export const CASH_ACCOUNT_TYPES = ["cash", "wallet"] as const;

/** Account types a receipt's lines (and the "Account / party" filter) pick from. */
export const LINE_ACCOUNT_TYPES = ["party"] as const;

/** Backend limits (dto/update-cash-receipt.dto.ts). */
export const CANCEL_REASON_MIN_LENGTH = 3;
export const REASON_MAX_LENGTH = 500;

export function cashReceiptPath(id: string): string {
  return `${CASH_RECEIPTS_PATH}/${encodeURIComponent(id)}`;
}

export function editCashReceiptPath(id: string): string {
  return `${cashReceiptPath(id)}/edit`;
}

export const NEW_CASH_RECEIPT_PATH = `${CASH_RECEIPTS_PATH}/new`;
