import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";

import { ACCOUNTS_PAGE_SIZE } from "./constants";
import {
  ACCOUNT_STATUSES,
  MANAGEABLE_ACCOUNT_TYPES,
  type AccountFilters,
  type AccountLookupItem,
  type AccountPage,
} from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** URL → filters. Anything unrecognised falls back to the default rather
 * than reaching the backend as an invalid query. */
export function parseAccountFilters(params: SearchParams): AccountFilters {
  const type = first(params.type);
  const status = first(params.status);
  const page = Number.parseInt(first(params.page), 10);

  return {
    q: first(params.q).trim().slice(0, 100),
    type: (MANAGEABLE_ACCOUNT_TYPES as readonly string[]).includes(type)
      ? (type as AccountFilters["type"])
      : "all",
    status: (ACCOUNT_STATUSES as readonly string[]).includes(status)
      ? (status as AccountFilters["status"])
      : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** One page of GET /accounts — searched, filtered and paged by the backend. */
export function getAccounts(
  filters: AccountFilters,
): Promise<ApiResult<AccountPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(ACCOUNTS_PAGE_SIZE),
  });
  if (filters.q) query.set("q", filters.q);
  if (filters.type !== "all") query.set("type", filters.type);
  if (filters.status !== "all") query.set("status", filters.status);

  return apiGet<AccountPage>(`/accounts?${query}`);
}

/** Active expense accounts for the bank-charge picker (lookup caps at 100). */
export function getExpenseAccounts(): Promise<ApiResult<AccountLookupItem[]>> {
  return apiGet<AccountLookupItem[]>(
    "/accounts/lookup?types=expense&limit=100",
  );
}

/** Active company cash, wallet, cheque and bank accounts: where handed-over
 * money is received (Company defaults, handover approval). */
export function getCashInHandAccounts(): Promise<
  ApiResult<AccountLookupItem[]>
> {
  return apiGet<AccountLookupItem[]>(
    "/accounts/lookup?scope=company&types=cash,wallet,cheque,bank&limit=100",
  );
}

interface RawLedgerAccount {
  _id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

export interface AccountSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

/** One account by id; `null` data when it no longer exists. */
export async function getAccount(
  id: string,
): Promise<ApiResult<AccountSummary | null>> {
  const result = await apiGet<RawLedgerAccount>(
    `/accounts/${encodeURIComponent(id)}`,
  );
  if (result.ok) {
    const { _id, code, name, type, balance } = result.data;
    return { ok: true, data: { id: _id, code, name, type, balance } };
  }
  if (result.reason === "error" && result.status === 404) {
    return { ok: true, data: null };
  }
  return result;
}
