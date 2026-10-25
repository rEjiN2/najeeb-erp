import { parseDateRange } from "@/features/vouchers/filters";

import type { PurchaseInvoiceFilters } from "./types";

// The list's view lives in the URL; the default range is this month.

type SearchParams = Record<string, string | string[] | undefined>;

const ID = /^[a-f\d]{24}$/i;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parsePurchaseInvoiceFilters(
  params: SearchParams,
): PurchaseInvoiceFilters {
  const status = first(params.status);
  const payment = first(params.payment);
  const supplier = first(params.supplier);
  const location = first(params.location);
  const page = Number.parseInt(first(params.page), 10);
  return {
    ...parseDateRange(params, "month"),
    status: status === "posted" || status === "cancelled" ? status : "all",
    paymentStatus:
      payment === "unpaid" || payment === "partly_paid" || payment === "paid"
        ? payment
        : "all",
    supplierId: ID.test(supplier) ? supplier : "",
    locationId: ID.test(location) ? location : "",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toPurchaseInvoiceSearch(
  filters: PurchaseInvoiceFilters,
): string {
  const params = new URLSearchParams();
  if (filters.range !== "month") params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.paymentStatus !== "all") {
    params.set("payment", filters.paymentStatus);
  }
  if (filters.supplierId) params.set("supplier", filters.supplierId);
  if (filters.locationId) params.set("location", filters.locationId);
  if (filters.q) params.set("q", filters.q);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
