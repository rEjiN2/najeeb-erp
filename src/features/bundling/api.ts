import "server-only";

import { resolveDateRange } from "@/features/vouchers/filters";
import type { VoucherDetail } from "@/features/vouchers/types";
import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";

import { BUNDLING_PAGE_SIZE } from "./constants";
import type {
  BundleOption,
  BundlingDetail,
  BundlingFilters,
  BundlingPage,
} from "./types";

/** GET /bundlings — only the query keys its DTO declares. */
export function getBundlings(
  filters: BundlingFilters,
): Promise<ApiResult<BundlingPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(BUNDLING_PAGE_SIZE),
  });
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.mode !== "all") query.set("mode", filters.mode);
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.locationId) query.set("locationId", filters.locationId);
  if (filters.bundleProductId) {
    query.set("bundleProductId", filters.bundleProductId);
  }
  if (filters.q) query.set("q", filters.q);
  return apiGet<BundlingPage>(`/bundlings?${query}`);
}

/** One bundling, with its voucher in the shared view's shape. */
export async function getBundling(
  id: string,
): Promise<ApiResult<{ voucher: VoucherDetail; detail: BundlingDetail }>> {
  const result = await apiGet<BundlingDetail>(
    `/bundlings/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;
  return {
    ok: true,
    data: {
      detail: raw,
      voucher: {
        id: raw.id,
        voucherNo: raw.voucherNo,
        voucherDate: raw.date,
        headerAccount: raw.location,
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
        comments: raw.remarks ?? "",
        lines: [],
        grossTotal: raw.qty,
        totalTax: 0,
        grandTotal: raw.qty,
        status: raw.status,
        createdBy: raw.createdBy,
        createdAt: raw.createdAt,
        updatedBy: null,
        updatedAt: null,
        cancelledBy: raw.cancelledBy,
        cancelledAt: raw.cancelledAt,
        cancelReason: raw.cancelReason,
        extraFields: [
          {
            key: "mode",
            label: "Mode",
            value: raw.mode === "bundle" ? "Bundle" : "Unbundle",
          },
          {
            key: "bundle",
            label: "Bundle product",
            value: raw.bundleProduct.name
              ? `${raw.bundleProduct.name} (${raw.bundleProduct.code})`
              : null,
          },
          { key: "qty", label: "Quantity", value: String(raw.qty) },
        ],
        attachments: [],
      },
    },
  };
}

/** Active bundle products, and which of them have a recipe (GET
 * /products/:id/recipe is a 404 without one). */
export async function getBundleOptions(): Promise<ApiResult<BundleOption[]>> {
  const bundles = await apiGet<
    {
      id: string;
      code: string;
      name: string;
      unit: { symbol: string } | null;
    }[]
  >("/products/lookup?type=bundle&limit=100");
  if (!bundles.ok) return bundles;
  const recipes = await Promise.all(
    bundles.data.map((bundle) => apiGet(`/products/${bundle.id}/recipe`)),
  );
  return {
    ok: true,
    data: bundles.data
      .filter((_, index) => recipes[index]!.ok)
      .map((bundle) => ({
        id: bundle.id,
        code: bundle.code,
        name: bundle.name,
        unit: bundle.unit?.symbol ?? null,
      })),
  };
}
