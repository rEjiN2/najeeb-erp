import {
  parseDateRange,
  resolveDateRange,
  type DatePreset,
} from "@/features/vouchers/filters";
import { isIsoDay } from "@/lib/datetime";

import type { AccountingReportKey } from "./constants";

type SearchParams = Record<string, string | string[] | undefined>;

export interface ReportFilters {
  range: DatePreset;
  /** Only with range "custom". YYYY-MM-DD. */
  from: string;
  to: string;
  accountId: string;
  /** Trial Balance drill-down: an account code to resolve to accountId. */
  code: string;
  cancelled: boolean;
  /** Trial Balance date; "" = today. */
  asOf: string;
  page: number;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** URL → filters; anything unrecognised falls back to the default. */
export function parseReportFilters(
  params: SearchParams,
  defaultRange: DatePreset,
): ReportFilters {
  const id = first(params.account);
  const asOf = first(params.asOf);
  const page = Number.parseInt(first(params.page), 10);
  return {
    ...parseDateRange(params, defaultRange),
    accountId: /^[a-f\d]{24}$/i.test(id) ? id : "",
    code: first(params.code).trim().slice(0, 40),
    cancelled: first(params.cancelled) === "1",
    asOf: isIsoDay(asOf) ? asOf : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Filters → query string, leaving defaults out. */
export function toReportSearch(
  filters: ReportFilters,
  defaultRange: DatePreset,
): string {
  const params = new URLSearchParams();
  if (filters.range !== defaultRange) params.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.accountId) params.set("account", filters.accountId);
  if (filters.code) params.set("code", filters.code);
  if (filters.cancelled) params.set("cancelled", "1");
  if (filters.asOf) params.set("asOf", filters.asOf);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** The backend query for a report (also what the exports forward). */
export function reportBackendQuery(
  key: AccountingReportKey,
  filters: ReportFilters,
  today: string,
): URLSearchParams {
  const query = new URLSearchParams();
  if (key === "trial-balance") {
    if (filters.asOf) query.set("asOf", filters.asOf);
    return query;
  }
  const { dateFrom, dateTo } = resolveDateRange(filters, today);
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.accountId) {
    query.set(key === "cash-book" ? "accountIds" : "accountId", filters.accountId);
  }
  if (filters.cancelled) query.set("includeCancelled", "true");
  if (filters.page > 1 && (key === "ledger" || key === "day-book")) {
    query.set("page", String(filters.page));
  }
  return query;
}
