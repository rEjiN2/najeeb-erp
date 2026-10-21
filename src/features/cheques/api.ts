import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";
import type { AccountLookupItem } from "@/features/vouchers/types";

import { CHEQUES_PAGE_SIZE } from "./constants";
import type { ChequeFilters, ChequePage, ChequeSummary } from "./types";

/** Filters → GET /cheques query. `status: null` leaves the tab out. */
export function toChequeQuery(
  filters: ChequeFilters,
  {
    status = filters.tab,
    page = filters.page,
    pageSize = CHEQUES_PAGE_SIZE,
  } = {} as {
    status?: string | null;
    page?: number;
    pageSize?: number;
  },
): URLSearchParams {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (status) query.set("status", status);
  if (filters.q) query.set("q", filters.q);
  if (filters.dueFrom) query.set("dueFrom", filters.dueFrom);
  if (filters.dueTo) query.set("dueTo", filters.dueTo);
  if (filters.customerId) query.set("customerId", filters.customerId);
  if (filters.bank) query.set("bank", filters.bank);
  if (filters.collectedBy) query.set("collectedBy", filters.collectedBy);
  return query;
}

export function getCheques(
  query: URLSearchParams,
): Promise<ApiResult<ChequePage>> {
  return apiGet<ChequePage>(`/cheques?${query}`);
}

/** Every cheque the user may see, summed (dashboard, sidebar badge). */
export async function getChequeSummary(): Promise<ApiResult<ChequeSummary>> {
  const result = await apiGet<ChequePage>("/cheques?page=1&pageSize=1");
  return result.ok ? { ok: true, data: result.data.summary } : result;
}

/** Where a cheque can be deposited (banks) or cleared into (banks, cash, wallets). */
export function getClearIntoAccounts(): Promise<
  ApiResult<AccountLookupItem[]>
> {
  return apiGet<AccountLookupItem[]>(
    "/accounts/lookup?scope=company&types=bank,cash,wallet&limit=100",
  );
}
