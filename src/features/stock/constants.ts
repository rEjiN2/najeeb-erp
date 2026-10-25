export const STOCK_SUMMARY_PATH =
  "/accounting-inventory/inventory/stock-summary";
export const STOCK_HISTORY_PATH =
  "/accounting-inventory/inventory/stock-history";
export const STOCK_SUMMARY_PAGE_SIZE = 20;

export const STOCK_SUMMARY_TITLE = "Stock Summary";
export const STOCK_SUMMARY_DESCRIPTION =
  "Quantity on hand per product, with each location's share.";
export const STOCK_HISTORY_TITLE = "Stock History";
export const STOCK_HISTORY_DESCRIPTION =
  "Every movement of one product, with the running balance.";

/** Opening stock's own path; history rows link to their voucher with it. */
export const OPENING_STOCK_PATH =
  "/accounting-inventory/transactions/opening-stock";

/** Voucher types (backend voucherType) the history can link to, and their label. */
const VOUCHER_TYPES: Record<string, { label: string; path?: string }> = {
  "opening-stock": { label: "Opening Stock", path: OPENING_STOCK_PATH },
  "purchase-invoice": {
    label: "Purchase Invoice",
    path: "/accounting-inventory/transactions/purchase-invoices",
  },
};

export function voucherTypeLabel(type: string): string {
  return VOUCHER_TYPES[type]?.label ?? type;
}

/** The voucher's view page, when this app has one. */
export function voucherHref(type: string, id: string): string | null {
  const path = VOUCHER_TYPES[type]?.path;
  return path ? `${path}/${encodeURIComponent(id)}` : null;
}

export function historyHref(productId: string, locationId = ""): string {
  const params = new URLSearchParams({ product: productId });
  if (locationId) params.set("location", locationId);
  return `${STOCK_HISTORY_PATH}?${params}`;
}

const QTY = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

/** Quantities may be fractional (kg): up to 3 decimals, no padding. */
export function formatQty(value: number | null | undefined): string {
  return QTY.format(value ?? 0);
}
