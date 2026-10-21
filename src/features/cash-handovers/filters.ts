import { HANDOVER_STATUS_TABS } from "./constants";
import type { HandoverFilters } from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** URL → filters; the default tab is what awaits approval. */
export function parseHandoverFilters(params: SearchParams): HandoverFilters {
  const status = first(params.status);
  const userId = first(params.user);
  const page = Number.parseInt(first(params.page), 10);
  return {
    status: (HANDOVER_STATUS_TABS as readonly string[]).includes(status)
      ? (status as HandoverFilters["status"])
      : "submitted",
    userId: /^[a-f\d]{24}$/i.test(userId) ? userId : "",
    dateFrom: DATE.test(first(params.from)) ? first(params.from) : "",
    dateTo: DATE.test(first(params.to)) ? first(params.to) : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Filters → query string, leaving defaults out. */
export function toHandoverSearch(filters: HandoverFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== "submitted") params.set("status", filters.status);
  if (filters.userId) params.set("user", filters.userId);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
