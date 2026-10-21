import { parseDateRange, resolveDateRange } from "@/features/vouchers/filters";

import type { SalesmanCollectionsFilters } from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_RANGE = "today";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const idParam = (value: string) => (/^[a-f\d]{24}$/i.test(value) ? value : "");

/** URL → filters; anything unrecognised falls back to the default. */
export function parseReportFilters(
  params: SearchParams,
): SalesmanCollectionsFilters {
  return {
    ...parseDateRange(params, DEFAULT_RANGE),
    userId: idParam(first(params.user)),
  };
}

/** Filters → query string, leaving defaults out. */
export function toReportSearch(filters: SalesmanCollectionsFilters): string {
  const params = new URLSearchParams();
  if (filters.range !== DEFAULT_RANGE) params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.userId) params.set("user", filters.userId);
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** The backend's dateFrom/dateTo for the range, resolved in UAE time. */
export function reportDateQuery(
  filters: SalesmanCollectionsFilters,
  today: string,
): URLSearchParams {
  const { dateFrom, dateTo } = resolveDateRange(filters, today);
  const query = new URLSearchParams();
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  return query;
}
