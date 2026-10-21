import { isIsoDay } from "@/lib/datetime";

import { CHEQUE_TABS, DEFAULT_CHEQUE_FILTERS } from "./constants";
import type { ChequeFilters, ChequeTab } from "./types";

// The register's view lives in the URL, like the voucher lists.

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const isMongoId = (value: string) => /^[a-f\d]{24}$/i.test(value);

export function parseChequeFilters(params: SearchParams): ChequeFilters {
  const tab = first(params.tab);
  const id = (key: string) => {
    const value = first(params[key]);
    return isMongoId(value) ? value : "";
  };
  const day = (key: string) => {
    const value = first(params[key]);
    return isIsoDay(value) ? value : "";
  };
  const page = Number.parseInt(first(params.page), 10);
  return {
    tab: CHEQUE_TABS.some((t) => t.value === tab)
      ? (tab as ChequeTab)
      : DEFAULT_CHEQUE_FILTERS.tab,
    q: first(params.q).trim().slice(0, 100),
    dueFrom: day("from"),
    dueTo: day("to"),
    customerId: id("customer"),
    bank: first(params.bank).trim().slice(0, 100),
    collectedBy: id("collector"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function toChequeSearch(filters: ChequeFilters): string {
  const params = new URLSearchParams();
  const d = DEFAULT_CHEQUE_FILTERS;
  if (filters.tab !== d.tab) params.set("tab", filters.tab);
  if (filters.q) params.set("q", filters.q);
  if (filters.dueFrom) params.set("from", filters.dueFrom);
  if (filters.dueTo) params.set("to", filters.dueTo);
  if (filters.customerId) params.set("customer", filters.customerId);
  if (filters.bank) params.set("bank", filters.bank);
  if (filters.collectedBy) params.set("collector", filters.collectedBy);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** Narrowing filters — the tab and page don't count. */
export function hasChequeFilters(filters: ChequeFilters): boolean {
  return Boolean(
    filters.q ||
    filters.dueFrom ||
    filters.dueTo ||
    filters.customerId ||
    filters.bank ||
    filters.collectedBy,
  );
}
