import "server-only";

import { hasPermission } from "@/features/auth/session";

import { CASH_PAYMENTS_MANAGE_PERMISSION } from "./constants";

/** Whether the signed-in user may create, edit and cancel payments. */
export function canManageCashPayments(): Promise<boolean> {
  return hasPermission(CASH_PAYMENTS_MANAGE_PERMISSION);
}
