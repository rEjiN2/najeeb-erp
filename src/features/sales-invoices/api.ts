import "server-only";

import { resolveDateRange } from "@/features/vouchers/filters";
import type { UserRef, VoucherDetail } from "@/features/vouchers/types";
import { apiGet, type ApiResult } from "@/lib/api";
import { formatCalendarDate, uaeToday } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import { SALES_INVOICES_PAGE_SIZE } from "./constants";
import type {
  InvoiceAllocation,
  PaymentStatus,
  SalesInvoiceFilters,
  SalesInvoiceLine,
  SalesInvoicePage,
} from "./types";

/** GET /sales-invoices — only the query keys its DTO declares. Scoped
 * users get their own from the backend. */
export function getSalesInvoices(
  filters: SalesInvoiceFilters,
): Promise<ApiResult<SalesInvoicePage>> {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(SALES_INVOICES_PAGE_SIZE),
    status: filters.status,
  });
  const { dateFrom, dateTo } = resolveDateRange(filters, uaeToday());
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (filters.customerId) query.set("customerId", filters.customerId);
  if (filters.locationId) query.set("locationId", filters.locationId);
  if (filters.soldById) query.set("soldById", filters.soldById);
  if (filters.q) query.set("q", filters.q);
  if (filters.paymentStatus !== "all") {
    query.set("paymentStatus", filters.paymentStatus);
  }
  return apiGet<SalesInvoicePage>(`/sales-invoices?${query}`);
}

/** GET /sales-invoices/:id — the serialized document plus overdue and allocations. */
type RawSalesInvoice = {
  _id: string;
  voucherNo: string;
  voucherDate: string;
  customerId: string;
  locationId: string;
  soldById: string;
  soldByName: string;
  dueDate: string;
  remarks?: string | null;
  lines: Omit<SalesInvoiceLine, "code" | "name" | "unit">[];
  grossTotal: number;
  totalDiscount: number;
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
  paidAmount: number;
  balance: number;
  creditedAmount?: number;
  returnedQty?: number;
  returnedAmount?: number;
  paymentStatus: PaymentStatus;
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

export interface SalesInvoiceDetail {
  /** In the shared voucher view's shape (meta strip, cancel, Activity). */
  voucher: VoucherDetail;
  customerId: string;
  customerName: string | null;
  locationId: string;
  locationName: string | null;
  soldBy: { id: string; name: string };
  dueDate: string;
  lines: SalesInvoiceLine[];
  grossTotal: number;
  totalDiscount: number;
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
  paidAmount: number;
  balance: number;
  creditedAmount: number;
  returnedQty: number;
  returnedAmount: number;
  paymentStatus: PaymentStatus;
  overdue: boolean;
  allocations: InvoiceAllocation[];
}

/**
 * One sales invoice with its customer, location and every product named.
 * The document stores only ids, so each is read once; a deleted one shows
 * as unknown.
 */
export async function getSalesInvoice(
  id: string,
): Promise<ApiResult<SalesInvoiceDetail>> {
  const result = await apiGet<RawSalesInvoice>(
    `/sales-invoices/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  const raw = result.data;
  const productIds = [
    ...new Set(raw.lines.map((line) => String(line.productId))),
  ];
  const [customer, location, ...products] = await Promise.all([
    apiGet<{ name: string }>(
      `/parties/${encodeURIComponent(String(raw.customerId))}`,
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
  const customerName = customer.ok ? customer.data.name : null;
  const locationName = location.ok ? location.data.name : null;

  return {
    ok: true,
    data: {
      customerId: String(raw.customerId),
      customerName,
      locationId: String(raw.locationId),
      locationName,
      soldBy: { id: String(raw.soldById), name: raw.soldByName },
      dueDate: raw.dueDate,
      grossTotal: raw.grossTotal,
      totalDiscount: raw.totalDiscount,
      taxableTotal: raw.taxableTotal,
      totalTax: raw.totalTax,
      netTotal: raw.netTotal,
      paidAmount: raw.paidAmount,
      balance: raw.balance,
      creditedAmount: raw.creditedAmount ?? 0,
      returnedQty: raw.returnedQty ?? 0,
      returnedAmount: raw.returnedAmount ?? 0,
      paymentStatus: raw.paymentStatus,
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
        headerAccount: { id: String(raw.customerId), name: customerName },
        collectedBy: { id: String(raw.soldById), name: raw.soldByName },
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
            label: "Sold From",
            value: locationName,
            id: String(raw.locationId),
          },
          {
            key: "dueDate",
            label: "Due Date",
            value: formatCalendarDate(raw.dueDate),
          },
          {
            key: "paid",
            label: "Paid",
            value: `AED ${formatAmount(raw.paidAmount)}`,
          },
          {
            key: "balance",
            label: "Balance",
            value: `AED ${formatAmount(raw.balance)}`,
          },
          ...(raw.returnedQty
            ? [
                {
                  key: "returned",
                  label: "Returned",
                  value: `${raw.returnedQty} units · AED ${formatAmount(raw.returnedAmount ?? 0)}`,
                },
                {
                  key: "credited",
                  label: "Credited",
                  value: `AED ${formatAmount(raw.creditedAmount ?? 0)}`,
                },
              ]
            : []),
        ],
        attachments: [],
      },
    },
  };
}
