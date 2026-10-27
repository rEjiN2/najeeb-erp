import "server-only";

import { resolveDateRange } from "@/features/vouchers/filters";
import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import { STOCK_COUNTS_PAGE_SIZE } from "./constants";
import type {
  StockCountDetail,
  StockCountFilters,
  StockCountPage,
} from "./types";

/** GET /stock-counts — only the query keys its DTO declares. */
export function getStockCounts(
  filters: StockCountFilters,
): Promise<ApiResult<StockCountPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(STOCK_COUNTS_PAGE_SIZE),
  });
  if (filters.status !== "all") query.set("status", filters.status);
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.locationId) query.set("locationId", filters.locationId);
  if (filters.q) query.set("q", filters.q);
  return apiGet<StockCountPage>(`/stock-counts?${query}`);
}

/** GET /stock-counts/:id — lines already carry code, name and unit. */
export function getStockCount(
  id: string,
): Promise<ApiResult<StockCountDetail>> {
  return apiGet<StockCountDetail>(`/stock-counts/${encodeURIComponent(id)}`);
}
