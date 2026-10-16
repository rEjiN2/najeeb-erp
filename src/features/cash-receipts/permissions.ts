import "server-only";

import { hasPermission } from "@/features/auth/session";

import { CASH_RECEIPTS_MANAGE_PERMISSION } from "./constants";

/** Whether the signed-in user may create, edit and cancel receipts. */
export function canManageCashReceipts(): Promise<boolean> {
  return hasPermission(CASH_RECEIPTS_MANAGE_PERMISSION);
}
