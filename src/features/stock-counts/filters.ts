import { parseDateRange } from "@/features/vouchers/filters";

import type { StockCountFilters } from "./types";

// The list's view lives in the URL. Counts are occasional: all time.

type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseStockCountFilters(
  params: SearchParams,
): StockCountFilters {
  const status = first(params.status);
  const location = first(params.location);
  const page = Number.parseInt(first(params.page), 10);
  return {
    ...parseDateRange(params, "all"),
    status: (STATUSES as readonly string[]).includes(status)
      ? (status as StockCountFilters["status"])
      : "all",
    locationId: /^[a-f\d]{24}$/i.test(location) ? location : "",
    q: first(params.q).slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toStockCountSearch(filters: StockCountFilters): string {
  const params = new URLSearchParams();
  if (filters.range !== "all") params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.locationId) params.set("location", filters.locationId);
  if (filters.q) params.set("q", filters.q);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
