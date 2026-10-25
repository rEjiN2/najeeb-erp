import "server-only";

import { resolveDateRange } from "@/features/vouchers/filters";
import type { UserRef, VoucherDetail } from "@/features/vouchers/types";
import { apiGet, type ApiResult } from "@/lib/api";
import { formatCalendarDate, uaeToday } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import { PURCHASE_INVOICES_PAGE_SIZE } from "./constants";
import type {
  InvoiceAllocation,
  PaymentStatus,
  PurchaseInvoiceFilters,
  PurchaseInvoiceLine,
  PurchaseInvoicePage,
} from "./types";

/** GET /purchase-invoices — only the query keys its DTO declares. */
export function getPurchaseInvoices(
  filters: PurchaseInvoiceFilters,
): Promise<ApiResult<PurchaseInvoicePage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(PURCHASE_INVOICES_PAGE_SIZE),
    status: filters.status,
  });
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.supplierId) query.set("supplierId", filters.supplierId);
  if (filters.locationId) query.set("locationId", filters.locationId);
  if (filters.q) query.set("q", filters.q);
  if (filters.paymentStatus !== "all") {
    query.set("paymentStatus", filters.paymentStatus);
  }
  return apiGet<PurchaseInvoicePage>(`/purchase-invoices?${query}`);
}

/** GET /parties/:id — the supplier filter's label. */
export async function getSupplierName(id: string): Promise<string | null> {
  if (!id) return null;
  const result = await apiGet<{ name: string }>(
    `/parties/${encodeURIComponent(id)}`,
  );
  return result.ok ? result.data.name : null;
}

/** GET /purchase-invoices/:id — the serialized document. */
type RawPurchaseInvoice = {
  _id: string;
  voucherNo: string;
  voucherDate: string;
  supplierId: string;
  locationId: string;
  billNo: string;
  billDate: string | null;
  dueDate: string;
  remarks?: string | null;
  attachmentFileRefs?: string[];
  updatePurchasePrice?: boolean;
  lines: Omit<PurchaseInvoiceLine, "code" | "name" | "unit">[];
  grossTotal: number;
  totalDiscount: number;
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
  paidAmount?: number;
  balance?: number;
  paymentStatus?: PaymentStatus;
  overdue?: boolean;
  allocations?: InvoiceAllocation[];
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

export interface PurchaseInvoiceDetail {
  /** In the shared voucher view's shape (meta strip, cancel, Activity). */
  voucher: VoucherDetail;
  supplierId: string;
  supplierName: string | null;
  locationId: string;
  locationName: string | null;
  billNo: string;
  billDate: string | null;
  dueDate: string;
  attachmentFileRefs: string[];
  updatePurchasePrice: boolean;
  lines: PurchaseInvoiceLine[];
  grossTotal: number;
  totalDiscount: number;
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
  paidAmount: number;
  balance: number;
  paymentStatus: PaymentStatus;
  overdue: boolean;
  allocations: InvoiceAllocation[];
}

/**
 * One purchase invoice with its supplier, location and every product named.
 * The document stores only ids, so each is read once; a deleted one shows
 * as unknown.
 */
export async function getPurchaseInvoice(
  id: string,
): Promise<ApiResult<PurchaseInvoiceDetail>> {
  const result = await apiGet<RawPurchaseInvoice>(
    `/purchase-invoices/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;
  const productIds = [
    ...new Set(raw.lines.map((line) => String(line.productId))),
  ];
  const [supplier, location, ...products] = await Promise.all([
    apiGet<{ name: string }>(
      `/parties/${encodeURIComponent(String(raw.supplierId))}`,
    ),
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
  const supplierName = supplier.ok ? supplier.data.name : null;
  const locationName = location.ok ? location.data.name : null;

  return {
    ok: true,
    data: {
      supplierId: String(raw.supplierId),
      supplierName,
      locationId: String(raw.locationId),
      locationName,
      billNo: raw.billNo,
      billDate: raw.billDate,
      dueDate: raw.dueDate,
      attachmentFileRefs: (raw.attachmentFileRefs ?? []).map(String),
      updatePurchasePrice: raw.updatePurchasePrice ?? true,
      grossTotal: raw.grossTotal,
      totalDiscount: raw.totalDiscount,
      taxableTotal: raw.taxableTotal,
      totalTax: raw.totalTax,
      netTotal: raw.netTotal,
      paidAmount: raw.paidAmount ?? 0,
      balance: raw.balance ?? raw.netTotal,
      paymentStatus: raw.paymentStatus ?? "unpaid",
      overdue: raw.overdue ?? false,
      allocations: raw.allocations ?? [],
      lines: raw.lines.map((line) => {
        const product = byId.get(String(line.productId)) ?? null;
        return {
          ...line,
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
        headerAccount: { id: String(raw.supplierId), name: supplierName },
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
            key: "location",
            label: "Received At",
            value: locationName,
            id: String(raw.locationId),
          },
          { key: "billNo", label: "Bill No", value: raw.billNo },
          {
            key: "billDate",
            label: "Bill Date",
            value: raw.billDate ? formatCalendarDate(raw.billDate) : null,
          },
          {
            key: "dueDate",
            label: "Due Date",
            value: formatCalendarDate(raw.dueDate),
          },
          {
            key: "paid",
            label: "Paid",
            value: `AED ${formatAmount(raw.paidAmount ?? 0)}`,
          },
          {
            key: "balance",
            label: "Balance",
            value: `AED ${formatAmount(raw.balance ?? raw.netTotal)}`,
          },
        ],
        attachments: [],
      },
    },
  };
}
