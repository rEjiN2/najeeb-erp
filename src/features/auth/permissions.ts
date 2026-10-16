// Mirrors the backend's Permission constant (modules/roles/permissions.ts).
// Only decides what the UI offers — the backend enforces every one of them.

export const PERMISSIONS = {
  ACCOUNTS_MANAGE: "accounts:manage",
  BALANCES_VIEW: "balances:view",
  CASH_RECEIPTS_READ: "cash-receipts:read",
  CASH_RECEIPTS_CREATE: "cash-receipts:create",
  CASH_RECEIPTS_EDIT: "cash-receipts:edit",
  CASH_RECEIPTS_CANCEL: "cash-receipts:cancel",
  CASH_PAYMENTS_READ: "cash-payments:read",
  CASH_PAYMENTS_CREATE: "cash-payments:create",
  CASH_PAYMENTS_EDIT: "cash-payments:edit",
  CASH_PAYMENTS_CANCEL: "cash-payments:cancel",
  CASHIERS_MANAGE: "cashiers:manage",
  COMPANY_MANAGE: "company:manage",
  LOCATIONS_MANAGE: "locations:manage",
  PARTIES_MANAGE: "parties:manage",
  PRODUCT_GROUPS_MANAGE: "product-groups:manage",
  ROLES_MANAGE: "roles:manage",
  USERS_MANAGE: "users:manage",
  DASHBOARD_VIEW: "dashboard:view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
