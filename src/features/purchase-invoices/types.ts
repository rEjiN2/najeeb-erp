import type { DatePreset } from "@/features/vouchers/filters";
import type { UserRef, VoucherStatus } from "@/features/vouchers/types";

// The backend's purchase-invoices module (purchase-invoice.service.ts,
// dto/purchase-invoice.dto.ts). Dates arrive as ISO strings.

/** Backend PaymentStatus: derived from the active allocations. */
export type PaymentStatus = "unpaid" | "partly_paid" | "paid";

/** GET /purchase-invoices item. */
export interface PurchaseInvoiceRow {
  id: string;
  voucherNo: string;
  voucherDate: string;
  supplier: { id: string; name: string | null };
  location: { id: string; name: string | null };
  billNo: string;
  billDate: string | null;
  dueDate: string;
  lineCount: number;
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
  paidAmount: number;
  balance: number;
  paymentStatus: PaymentStatus;
  /** Posted, money still owed, past the due day (Asia/Dubai). */
  overdue: boolean;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  commentCount: number;
}

export interface PurchaseInvoicePage {
  items: PurchaseInvoiceRow[];
  page: number;
  pageSize: number;
  /** netTotal leaves out cancelled invoices. */
  summary: { count: number; netTotal: number; outstanding: number };
}

export interface PurchaseInvoiceFilters {
  range: DatePreset;
  from: string;
  to: string;
  status: "all" | "posted" | "cancelled";
  paymentStatus: PaymentStatus | "all";
  supplierId: string;
  locationId: string;
  /** Invoice number or the supplier's bill number. */
  q: string;
  page: number;
}

/** One product's line, with the product resolved; amounts from the backend. */
export interface PurchaseInvoiceLine {
  /** The line's id: what a return names. */
  _id?: string;
  /** Quantity already returned. */
  returnedQty?: number;
  productId: string;
  code: string | null;
  name: string | null;
  unit: string | null;
  qty: number;
  rate: number;
  discount: number;
  amount: number;
  vatRate: number;
  vat: number;
  netAmount: number;
}

/** A payment applied to the invoice (active or reversed). */
export interface InvoiceAllocation {
  id: string;
  paymentVoucherType: string;
  paymentVoucherId: string;
  paymentVoucherNo: string;
  paymentLineIndex: number;
  amount: number;
  status: "active" | "reversed";
  createdBy: UserRef | null;
  createdAt: string | null;
  reversedBy: UserRef | null;
  reversedAt: string | null;
  reverseReason: string | null;
}

/** GET /parties/:id/unallocated-payments item. */
export interface UnallocatedPayment {
  paymentVoucherType: string;
  paymentVoucherId: string;
  voucherNo: string;
  voucherDate: string;
  paymentLineIndex: number;
  amount: number;
  allocated: number;
  unallocated: number;
}

/** What the form submits. */
export interface PurchaseInvoiceInput {
  date: string;
  supplierId: string;
  locationId: string;
  billNo: string;
  billDate: string;
  dueDate: string;
  remarks: string;
  attachmentFileRefs: string[];
  updatePurchasePrice: boolean;
  lines: {
    productId: string;
    qty: number;
    rate: number;
    discount: number;
    vatRate: number;
  }[];
}
