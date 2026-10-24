import { parseDateRange } from "@/features/vouchers/filters";

import type { OpeningBalanceFilters } from "./types";

// The list's view lives in the URL, like the voucher lists. Opening balances
// are entered once, so the default range is all time.

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseOpeningBalanceFilters(
  params: SearchParams,
): OpeningBalanceFilters {
  const status = first(params.status);
  const account = first(params.account);
  const page = Number.parseInt(first(params.page), 10);
  return {
    ...parseDateRange(params, "all"),
    status: status === "posted" || status === "cancelled" ? status : "all",
    accountId: /^[a-f\d]{24}$/i.test(account) ? account : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toOpeningBalanceSearch(filters: OpeningBalanceFilters): string {
  const params = new URLSearchParams();
  if (filters.range !== "all") params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.accountId) params.set("account", filters.accountId);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}
