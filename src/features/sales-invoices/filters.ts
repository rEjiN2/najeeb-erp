import { parseDateRange } from "@/features/vouchers/filters";

import type { SalesInvoiceFilters } from "./types";

// The list's view lives in the URL; the default range is this month.

type SearchParams = Record<string, string | string[] | undefined>;

const ID = /^[a-f\d]{24}$/i;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseSalesInvoiceFilters(
  params: SearchParams,
): SalesInvoiceFilters {
  const status = first(params.status);
  const payment = first(params.payment);
  const customer = first(params.customer);
  const location = first(params.location);
  const soldBy = first(params.soldBy);
  const page = Number.parseInt(first(params.page), 10);
  return {
    ...parseDateRange(params, "month"),
    status: status === "posted" || status === "cancelled" ? status : "all",
    paymentStatus:
      payment === "unpaid" || payment === "partly_paid" || payment === "paid"
        ? payment
        : "all",
    customerId: ID.test(customer) ? customer : "",
    locationId: ID.test(location) ? location : "",
    soldById: ID.test(soldBy) ? soldBy : "",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toSalesInvoiceSearch(filters: SalesInvoiceFilters): string {
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
  if (filters.customerId) params.set("customer", filters.customerId);
  if (filters.locationId) params.set("location", filters.locationId);
  if (filters.soldById) params.set("soldBy", filters.soldById);
  if (filters.q) params.set("q", filters.q);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
