import type {
  InvoiceAllocation,
  PaymentStatus,
} from "@/features/purchase-invoices/types";
import type { DatePreset } from "@/features/vouchers/filters";
import type {
  PaymentMethod,
  UserRef,
  VoucherStatus,
} from "@/features/vouchers/types";

// The backend's sales-invoices module (sales-invoice.service.ts,
// dto/sales-invoice.dto.ts). Dates arrive as ISO strings.

export type { InvoiceAllocation, PaymentStatus };

/** GET /sales-invoices item. */
export interface SalesInvoiceRow {
  id: string;
  voucherNo: string;
  voucherDate: string;
  customer: { id: string; name: string | null };
  location: { id: string; name: string | null };
  soldBy: { id: string; name: string };
  dueDate: string;
  lineCount: number;
  taxableTotal: number;
  totalTax: number;
  netTotal: number;
  paidAmount: number;
  balance: number;
  paymentStatus: PaymentStatus;
  overdue: boolean;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  commentCount: number;
}

export interface SalesInvoicePage {
  items: SalesInvoiceRow[];
  page: number;
  pageSize: number;
  /** netTotal and outstanding leave out cancelled invoices. */
  summary: { count: number; netTotal: number; outstanding: number };
}

export interface SalesInvoiceFilters {
  range: DatePreset;
  from: string;
  to: string;
  status: "all" | "posted" | "cancelled";
  paymentStatus: PaymentStatus | "all";
  customerId: string;
  locationId: string;
  soldById: string;
  /** Invoice number. */
  q: string;
  page: number;
}

/** One product's line, with the product resolved; amounts from the backend. */
export interface SalesInvoiceLine {
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

/** What the form submits. */
export interface SalesInvoiceInput {
  date: string;
  customerId: string;
  locationId: string;
  soldById: string;
  dueDate: string;
  remarks: string;
  lines: {
    productId: string;
    qty: number;
    rate: number;
    discount: number;
    vatRate: number;
  }[];
  /** New invoices only: money taken at the sale. */
  payNow: {
    method: PaymentMethod;
    accountId: string | null;
    amount: number;
    chequeNumber: string;
    chequeDate: string;
    chequeBankName: string;
    paymentReference: string;
  } | null;
  /** Confirms going over the customer's credit limit. */
  acknowledgeCredit: boolean;
}
