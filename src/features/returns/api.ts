import "server-only";

import { getPurchaseInvoice } from "@/features/purchase-invoices/api";
import { getSalesInvoice } from "@/features/sales-invoices/api";
import { resolveDateRange } from "@/features/vouchers/filters";
import type { UserRef, VoucherDetail } from "@/features/vouchers/types";
import { apiGet, type ApiResult } from "@/lib/api";
import { uaeToday } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import { RETURN_KINDS, RETURNS_PAGE_SIZE } from "./constants";
import type {
  InvoiceReturn,
  ReturnFilters,
  ReturnKind,
  ReturnLine,
  ReturnPage,
  ReturnSource,
} from "./types";

/** GET /sales-returns | /purchase-returns — only the query keys its DTO
 * declares. */
export function getReturns(
  kind: ReturnKind,
  filters: ReturnFilters,
): Promise<ApiResult<ReturnPage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(RETURNS_PAGE_SIZE),
    status: filters.status,
  });
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.partyId) query.set("partyId", filters.partyId);
  if (filters.invoiceId) query.set("invoiceId", filters.invoiceId);
  if (filters.q) query.set("q", filters.q);
  return apiGet<ReturnPage>(`${RETURN_KINDS[kind].apiPath}?${query}`);
}

/** The posted and cancelled returns of one invoice, for its view page. */
export async function getInvoiceReturns(
  kind: ReturnKind,
  invoiceId: string,
): Promise<ApiResult<InvoiceReturn[]>> {
  const result = await apiGet<ReturnPage>(
    `${RETURN_KINDS[kind].apiPath}?${new URLSearchParams({ invoiceId, pageSize: "100" })}`,
  );
  return result.ok ? { ok: true, data: result.data.items } : result;
}

/** The invoice number a list filter is showing. */
export async function getInvoiceNo(
  kind: ReturnKind,
  invoiceId: string,
): Promise<string | null> {
  if (!invoiceId) return null;
  const result = await apiGet<{ voucherNo: string }>(
    `${RETURN_KINDS[kind].invoiceApiPath}/${encodeURIComponent(invoiceId)}`,
  );
  return result.ok ? result.data.voucherNo : null;
}

/** The invoice to return against, with each line's quantity left. */
export async function getReturnSource(
  kind: ReturnKind,
  invoiceId: string,
): Promise<ApiResult<ReturnSource>> {
  const result =
    kind === "sales"
      ? await getSalesInvoice(invoiceId)
      : await getPurchaseInvoice(invoiceId);
  if (!result.ok) return result;
  const detail = result.data;
  return {
    ok: true,
    data: {
      id: invoiceId,
      voucherNo: detail.voucher.voucherNo,
      partyId: detail.voucher.headerAccount.id,
      partyName: detail.voucher.headerAccount.name,
      locationId: detail.locationId,
      status: detail.voucher.status,
      balance: detail.balance,
      lines: detail.lines.map((line) => ({
        invoiceLineId: String(line._id),
        productId: line.productId,
        code: line.code,
        name: line.name,
        unit: line.unit,
        qty: line.qty,
        returnedQty: line.returnedQty ?? 0,
        amount: line.amount,
        vat: line.vat,
      })),
    },
  };
}

/** GET /<kind>-returns/:id — the serialized document plus its credit. */
type RawReturn = {
  _id: string;
  voucherNo: string;
  voucherDate: string;
  invoiceId: string;
  invoiceNo: string;
  partyId: string;
  locationId: string;
  reason: string;
  lines: Omit<ReturnLine, "code" | "name" | "unit">[];
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
  creditApplied: number;
  onAccount: number;
  status?: "posted" | "cancelled";
  createdBy?: UserRef | null;
  createdAt?: string | null;
  updatedBy?: UserRef | null;
  updatedAt?: string | null;
  cancelledBy?: UserRef | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
};

type RawProduct = {
  id: string;
  code: string;
  name: string;
  unit: { symbol: string } | null;
};

export interface ReturnDetail {
  /** In the shared voucher view's shape (meta strip, cancel, Activity). */
  voucher: VoucherDetail;
  invoiceId: string;
  invoiceNo: string;
  lines: ReturnLine[];
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
}

/** One return with its party, location and every product named. */
export async function getReturn(
  kind: ReturnKind,
  id: string,
): Promise<ApiResult<ReturnDetail>> {
  const result = await apiGet<RawReturn>(
    `${RETURN_KINDS[kind].apiPath}/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;
  const productIds = [
    ...new Set(raw.lines.map((line) => String(line.productId))),
  ];
  const [party, location, ...products] = await Promise.all([
    apiGet<{ name: string }>(`/parties/${encodeURIComponent(raw.partyId)}`),
    apiGet<{ name: string }>(
      `/locations/${encodeURIComponent(String(raw.locationId))}`,
    ),
    ...productIds.map((productId) =>
      apiGet<RawProduct>(`/products/${encodeURIComponent(productId)}`),
    ),
  ]);
  const byId = new Map<string, RawProduct>();
  for (const product of products) {
    if (product.ok) byId.set(product.data.id, product.data);
    else if (product.status !== 404) return product;
  }
  const partyName = party.ok ? party.data.name : null;

  return {
    ok: true,
    data: {
      invoiceId: String(raw.invoiceId),
      invoiceNo: raw.invoiceNo,
      taxableTotal: raw.taxableTotal,
      totalTax: raw.totalTax,
      netTotal: raw.netTotal,
      lines: raw.lines.map((line) => {
        const product = byId.get(String(line.productId)) ?? null;
        return {
          ...line,
          invoiceLineId: String(line.invoiceLineId),
          productId: String(line.productId),
          code: product?.code ?? null,
          name: product?.name ?? null,
          unit: product?.unit?.symbol ?? null,
        };
      }),
      voucher: {
        id: String(raw._id),
        voucherNo: raw.voucherNo,
        voucherDate: raw.voucherDate,
        headerAccount: { id: String(raw.partyId), name: partyName },
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
        comments: raw.reason,
        lines: [],
        grossTotal: raw.taxableTotal,
        totalTax: raw.totalTax,
        grandTotal: raw.netTotal,
        status: raw.status ?? "posted",
        createdBy: raw.createdBy ?? null,
        createdAt: raw.createdAt ?? null,
        updatedBy: raw.updatedBy ?? null,
        updatedAt: raw.updatedAt ?? null,
        cancelledBy: raw.cancelledBy ?? null,
        cancelledAt: raw.cancelledAt ?? null,
        cancelReason: raw.cancelReason ?? null,
        extraFields: [
          {
            key: "invoice",
            label: RETURN_KINDS[kind].invoiceLabel,
            value: raw.invoiceNo,
          },
          {
            key: "location",
            label: RETURN_KINDS[kind].locationLabel,
            value: location.ok ? location.data.name : null,
            id: String(raw.locationId),
          },
          {
            key: "applied",
            label: "Applied to invoice",
            value: `AED ${formatAmount(raw.creditApplied)}`,
          },
          {
            key: "onAccount",
            label: "On account",
            value: `AED ${formatAmount(raw.onAccount)}`,
          },
        ],
        attachments: [],
      },
    },
  };
}
