import { parseDateRange } from "@/features/vouchers/filters";

import type { StockHistoryFilters, StockSummaryFilters } from "./types";

// Both screens keep their view in the URL, like the voucher lists.

type SearchParams = Record<string, string | string[] | undefined>;

const ID = /^[a-f\d]{24}$/i;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function id(value: string | string[] | undefined): string {
  const text = first(value);
  return ID.test(text) ? text : "";
}

export function parseSummaryFilters(params: SearchParams): StockSummaryFilters {
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    groupId: id(params.group),
    locationId: id(params.location),
    lowStock: first(params.low) === "1",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toSummarySearch(filters: StockSummaryFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.groupId) params.set("group", filters.groupId);
  if (filters.locationId) params.set("location", filters.locationId);
  if (filters.lowStock) params.set("low", "1");
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** History covers all time unless a range is picked. */
export function parseHistoryFilters(params: SearchParams): StockHistoryFilters {
  return {
    ...parseDateRange(params, "all"),
    productId: id(params.product),
    locationId: id(params.location),
  };
}

export function toHistorySearch(filters: StockHistoryFilters): string {
  const params = new URLSearchParams();
  if (filters.productId) params.set("product", filters.productId);
  if (filters.locationId) params.set("location", filters.locationId);
  if (filters.range !== "all") params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}
