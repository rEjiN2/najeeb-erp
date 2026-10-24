import "server-only";

import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession, hasPermission } from "@/features/auth/session";
import { getStockLocations } from "@/features/locations/api";
import type { StockLocation } from "@/features/locations/types";
import { resolveDateRange } from "@/features/vouchers/filters";
import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import { STOCK_SUMMARY_PAGE_SIZE } from "./constants";
import type {
  ProductLookupItem,
  StockHistory,
  StockHistoryFilters,
  StockSummaryFilters,
  StockSummaryPage,
} from "./types";

/** GET /stock/summary — only the query keys its DTO declares. */
export function getStockSummary(
  filters: StockSummaryFilters,
): Promise<ApiResult<StockSummaryPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(STOCK_SUMMARY_PAGE_SIZE),
  });
  if (filters.q) query.set("q", filters.q);
  if (filters.groupId) query.set("groupId", filters.groupId);
  if (filters.locationId) query.set("locationId", filters.locationId);
  if (filters.lowStock) query.set("lowStock", "true");
  return apiGet<StockSummaryPage>(`/stock/summary?${query}`);
}

/** GET /stock/history for one product. */
export function getStockHistory(
  filters: StockHistoryFilters,
): Promise<ApiResult<StockHistory>> {
  const query = new URLSearchParams({ productId: filters.productId });
  if (filters.locationId) query.set("locationId", filters.locationId);
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  return apiGet<StockHistory>(`/stock/history?${query}`);
}

/** GET /products/:id, reduced to what the product picker shows. */
export async function getProductRef(
  id: string,
): Promise<ApiResult<ProductLookupItem>> {
  const result = await apiGet<ProductLookupItem>(
    `/products/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const { code, name, unit } = result.data;
  return { ok: true, data: { id, code, name, unit } };
}

export function canViewStock(): Promise<boolean> {
  return hasPermission(PERMISSIONS.STOCK_READ);
}

/**
 * The location filter's options: every active warehouse, store and van, or
 * for an "own"-scoped user only their assigned ones (the backend refuses
 * the rest with 403).
 */
export async function getVisibleStockLocations(): Promise<
  ApiResult<StockLocation[]>
> {
  const [locations, session] = await Promise.all([
    getStockLocations(),
    getServerSession(),
  ]);
  if (!locations.ok || session?.user.dataScope !== "own") return locations;
  const allowed = session.user.allowedLocationIds ?? [];
  return {
    ok: true,
    data: locations.data.filter((location) => allowed.includes(location.id)),
  };
}
