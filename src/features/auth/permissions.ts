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
  /** The cheque register and a cheque's activity. */
  CHEQUES_READ: "cheques:read",
  CHEQUES_DEPOSIT: "cheques:deposit",
  CHEQUES_CLEAR: "cheques:clear",
  CHEQUES_RETURN: "cheques:return",
  CASH_HANDOVERS_READ: "cash-handovers:read",
  CASH_HANDOVERS_CREATE: "cash-handovers:create",
  CASH_HANDOVERS_APPROVE: "cash-handovers:approve",
  CASH_HANDOVERS_CANCEL: "cash-handovers:cancel",
  COMPANY_MANAGE: "company:manage",
  OPENING_BALANCES_READ: "opening-balances:read",
  /** Stock summary and history; scoped users see only their locations. */
  STOCK_READ: "stock:read",
  OPENING_STOCK_READ: "opening-stock:read",
  STOCK_COUNTS_READ: "stock-counts:read",
  /** System quantities and differences on a count; without it a count is blind. */
  STOCK_VIEW_SYSTEM_QTY: "stock:view-system-qty",
  PURCHASE_INVOICES_READ: "purchase-invoices:read",
  SALES_INVOICES_READ: "sales-invoices:read",
  SALES_RETURNS_READ: "sales-returns:read",
  PURCHASE_RETURNS_READ: "purchase-returns:read",
  /** Change a sales line's rate (and VAT %) from the product's. */
  SALES_OVERRIDE_PRICE: "sales:override-price",
  /** Give a discount on a sales line. */
  SALES_DISCOUNT: "sales:discount",
  /** Apply payments to bills and reverse them. */
  ALLOCATIONS_MANAGE: "allocations:manage",
  LOCATIONS_MANAGE: "locations:manage",
  PARTIES_MANAGE: "parties:manage",
  PRODUCT_GROUPS_MANAGE: "product-groups:manage",
  PRODUCTS_MANAGE: "products:manage",
  /** See purchase prices (cost). Never for van salesmen. */
  PRODUCTS_VIEW_COST: "products:view-cost",
  /** Define and change bundle recipes. */
  BUNDLES_MANAGE: "bundles:manage",
  BUNDLING_READ: "bundling:read",
  UNITS_MANAGE: "units:manage",
  /** The salesman collections report. */
  REPORTS_SALESMAN: "reports:salesman",
  ROLES_MANAGE: "roles:manage",
  USERS_MANAGE: "users:manage",
  /** Pick someone else as Collected By / Paid By. */
  VOUCHERS_SELECT_COLLECTOR: "vouchers:select-collector",
  DASHBOARD_VIEW: "dashboard:view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
