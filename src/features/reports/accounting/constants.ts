import type { DatePreset } from "@/features/vouchers/filters";
import { CASH_HANDOVERS_PATH } from "@/features/cash-handovers/constants";
import { CASH_PAYMENTS_PATH } from "@/features/cash-payments/constants";
import {
  CASH_RECEIPTS_PATH,
  REFERENCE_RECEIPTS_PATH,
} from "@/features/cash-receipts/constants";
import { OPENING_BALANCES_PATH } from "@/features/opening-balances/constants";
import { PURCHASE_INVOICES_PATH } from "@/features/purchase-invoices/constants";
import { RETURN_KINDS } from "@/features/returns/constants";
import { SALES_INVOICES_PATH } from "@/features/sales-invoices/constants";

export type AccountingReportKey =
  | "ledger"
  | "day-book"
  | "cash-book"
  | "trial-balance";

interface ReportMeta {
  path: string;
  title: string;
  description: string;
  defaultRange: DatePreset;
  /** Account picker: its types, and whether the report needs one. */
  account: { types: string[]; required: boolean; placeholder: string } | null;
  /** "asOf": a single date instead of a range. */
  dates: "range" | "asOf";
  /** Offers "Show cancelled". */
  cancelled: boolean;
  /** Backend pages the rows. */
  paged: boolean;
}

const BASE = "/accounting-inventory/reports";

export const ACCOUNTING_REPORTS: Record<AccountingReportKey, ReportMeta> = {
  ledger: {
    path: `${BASE}/ledger`,
    title: "Ledger",
    description: "Statement of any account, customer or supplier.",
    defaultRange: "month",
    account: {
      types: [
        "party",
        "supplier",
        "cash",
        "wallet",
        "cheque",
        "bank",
        "income",
        "expense",
        "other",
      ],
      required: true,
      placeholder: "Select an account or party",
    },
    dates: "range",
    cancelled: true,
    paged: true,
  },
  "day-book": {
    path: `${BASE}/day-book`,
    title: "Day Book",
    description: "Every voucher posted in the period, across all types.",
    defaultRange: "today",
    account: null,
    dates: "range",
    cancelled: true,
    paged: true,
  },
  "cash-book": {
    path: `${BASE}/cash-book`,
    title: "Cash and Bank Book",
    description: "Daily opening, receipts, payments and closing.",
    defaultRange: "month",
    account: {
      types: ["cash", "wallet", "cheque", "bank"],
      required: false,
      placeholder: "All cash and bank accounts",
    },
    dates: "range",
    cancelled: true,
    paged: false,
  },
  "trial-balance": {
    path: `${BASE}/trial-balance`,
    title: "Trial Balance",
    description: "Closing balance of every account as of a date.",
    defaultRange: "today",
    account: null,
    dates: "asOf",
    cancelled: false,
    paged: false,
  },
};

/** Where a voucher type's view page lives; null for types with no screen. */
const VOUCHER_PATHS: Record<string, string> = {
  "cash-receipt": CASH_RECEIPTS_PATH,
  "reference-receipt": REFERENCE_RECEIPTS_PATH,
  "cash-payment": CASH_PAYMENTS_PATH,
  "cash-handover": CASH_HANDOVERS_PATH,
  "sales-invoice": SALES_INVOICES_PATH,
  "purchase-invoice": PURCHASE_INVOICES_PATH,
  "sales-return": RETURN_KINDS.sales.path,
  "purchase-return": RETURN_KINDS.purchase.path,
  "opening-balance": OPENING_BALANCES_PATH,
};

export function voucherViewPath(type: string, id: string): string | null {
  const base = VOUCHER_PATHS[type];
  return base ? `${base}/${id}` : null;
}

export const VOUCHER_TYPE_LABELS: Record<string, string> = {
  "cash-receipt": "Receipt",
  "reference-receipt": "Reference Receipt",
  "cash-payment": "Payment",
  "cash-handover": "Handover",
  "sales-invoice": "Sales Invoice",
  "purchase-invoice": "Purchase Invoice",
  "sales-return": "Sales Return",
  "purchase-return": "Purchase Return",
  "opening-balance": "Opening Balance",
};
