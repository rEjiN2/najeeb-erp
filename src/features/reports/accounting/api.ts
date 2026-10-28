import "server-only";

import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/session";
import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import type { AccountingReportKey } from "./constants";
import { reportBackendQuery, type ReportFilters } from "./filters";

export function canViewAccountingReports(): Promise<boolean> {
  return hasPermission(PERMISSIONS.REPORTS_ACCOUNTING);
}

export function getAccountingReport<T>(
  key: AccountingReportKey,
  filters: ReportFilters,
): Promise<ApiResult<T>> {
  const query = reportBackendQuery(key, filters, uaeToday());
  return apiGet<T>(`/reports/${key}?${query}`);
}

/** Trial Balance rows carry a code, not an id: find the account behind it. */
export async function findAccountIdByCode(
  code: string,
): Promise<string | null> {
  const result = await apiGet<{ items: { id: string; code: string }[] }>(
    `/accounts?${new URLSearchParams({ q: code, limit: "10" })}`,
  );
  if (!result.ok) return null;
  return result.data.items.find((item) => item.code === code)?.id ?? null;
}
