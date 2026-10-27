import { parseDateRange } from "@/features/vouchers/filters";

import type { ReturnFilters } from "./types";

// The list's view lives in the URL; the default range is this month.

type SearchParams = Record<string, string | string[] | undefined>;

const ID = /^[a-f\d]{24}$/i;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseReturnFilters(params: SearchParams): ReturnFilters {
  const status = first(params.status);
  const party = first(params.party);
  const invoice = first(params.invoice);
  const page = Number.parseInt(first(params.page), 10);
  return {
    ...parseDateRange(params, "month"),
    status: status === "posted" || status === "cancelled" ? status : "all",
    partyId: ID.test(party) ? party : "",
    invoiceId: ID.test(invoice) ? invoice : "",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toReturnSearch(filters: ReturnFilters): string {
  const params = new URLSearchParams();
  if (filters.range !== "month") params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.partyId) params.set("party", filters.partyId);
  if (filters.invoiceId) params.set("invoice", filters.invoiceId);
  if (filters.q) params.set("q", filters.q);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
