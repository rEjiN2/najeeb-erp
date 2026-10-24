import "server-only";

import { getProductRef } from "@/features/stock/api";
import type { ProductLookupItem } from "@/features/stock/types";
import { resolveDateRange } from "@/features/vouchers/filters";
import type { UserRef, VoucherDetail } from "@/features/vouchers/types";
import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import { OPENING_STOCK_PAGE_SIZE } from "./constants";
import type {
  OpeningStockFilters,
  OpeningStockLine,
  OpeningStockPage,
} from "./types";

/** GET /opening-stock — only the query keys its DTO declares. */
export function getOpeningStocks(
  filters: OpeningStockFilters,
): Promise<ApiResult<OpeningStockPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(OPENING_STOCK_PAGE_SIZE),
    status: filters.status,
  });
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.locationId) query.set("locationId", filters.locationId);
  return apiGet<OpeningStockPage>(`/opening-stock?${query}`);
}

/** GET /opening-stock/:id — the serialized document. */
type RawOpeningStock = {
  _id: string;
  voucherNo: string;
  asOfDate: string;
  locationId: string;
  comments?: string | null;
  lines: { productId: string; qty: number; unitCost: number | null }[];
  totalQty: number;
  status?: "posted" | "cancelled";
  createdBy?: UserRef | null;
  createdAt?: string | null;
  updatedBy?: UserRef | null;
  updatedAt?: string | null;
  cancelledBy?: UserRef | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
};

export interface OpeningStockDetail {
  /** In the shared voucher view's shape (meta strip, cancel, Activity). */
  voucher: VoucherDetail;
  locationId: string;
  lines: OpeningStockLine[];
  totalQty: number;
}

/**
 * One opening stock voucher with its location and every product named. The
 * document stores only ids, so each is read once; a deleted one shows as
 * unknown.
 */
export async function getOpeningStock(
  id: string,
): Promise<ApiResult<OpeningStockDetail>> {
  const result = await apiGet<RawOpeningStock>(
    `/opening-stock/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;
  const productIds = [
    ...new Set(raw.lines.map((line) => String(line.productId))),
  ];
  const [location, ...products] = await Promise.all([
    apiGet<{ name: string }>(
      `/locations/${encodeURIComponent(String(raw.locationId))}`,
    ),
    ...productIds.map((productId) => getProductRef(productId)),
  ]);
  const byId = new Map<string, ProductLookupItem>();
  for (const product of products) {
    if (product.ok) byId.set(product.data.id, product.data);
    else if (product.status !== 404) return product;
  }

  return {
    ok: true,
    data: {
      locationId: String(raw.locationId),
      totalQty: raw.totalQty,
      lines: raw.lines.map((line) => {
        const product = byId.get(String(line.productId)) ?? null;
        return {
          productId: String(line.productId),
          code: product?.code ?? null,
          name: product?.name ?? null,
          unit: product?.unit?.symbol ?? null,
          qty: line.qty,
          unitCost: line.unitCost ?? null,
        };
      }),
      voucher: {
        id: String(raw._id),
        voucherNo: raw.voucherNo,
        voucherDate: raw.asOfDate,
        headerAccount: {
          id: String(raw.locationId),
          name: location.ok ? location.data.name : null,
        },
        collectedBy: {
          id: raw.createdBy?.id ?? null,
          name: raw.createdBy?.name ?? null,
        },
        paymentMethod: "cash",
        paymentReference: null,
        chequeDate: null,
        chequeNumber: null,
        chequeBankName: null,
        chequeStatus: null,
        comments: raw.comments ?? "",
        lines: [],
        grossTotal: raw.totalQty,
        totalTax: 0,
        grandTotal: raw.totalQty,
        status: raw.status ?? "posted",
        createdBy: raw.createdBy ?? null,
        createdAt: raw.createdAt ?? null,
        updatedBy: raw.updatedBy ?? null,
        updatedAt: raw.updatedAt ?? null,
        cancelledBy: raw.cancelledBy ?? null,
        cancelledAt: raw.cancelledAt ?? null,
        cancelReason: raw.cancelReason ?? null,
        extraFields: [],
        attachments: [],
      },
    },
  };
}
