import "server-only";

import { hasPermission } from "@/features/auth/session";
import { PERMISSIONS } from "@/features/auth/permissions";
import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import { reportDateQuery } from "./filters";
import type {
  SalesmanCollectionsFilters,
  SalesmanCollectionsReport,
} from "./types";

export function getSalesmanCollections(
  filters: SalesmanCollectionsFilters,
): Promise<ApiResult<SalesmanCollectionsReport>> {
  const query = reportDateQuery(filters, uaeToday());
  if (filters.cashierId) query.set("cashierId", filters.cashierId);
  if (filters.locationId) query.set("locationId", filters.locationId);
  return apiGet<SalesmanCollectionsReport>(
    `/reports/salesman-collections?${query}`,
  );
}

export function canViewSalesmanCollections(): Promise<boolean> {
  return hasPermission(PERMISSIONS.REPORTS_SALESMAN);
}
