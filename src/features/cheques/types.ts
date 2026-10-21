import type { ChequeStatus, CollectorRef } from "@/features/vouchers/types";

// The backend's cheques module (cheque.service.ts, dto/cheque.dto.ts).
// A cheque's id is its receipt's id. Dates arrive as ISO strings.

export type { ChequeStatus };

interface Ref {
  id: string;
  name: string | null;
}

/** One row of GET /cheques. */
export interface ChequeRow {
  id: string;
  voucherNo: string;
  receiptDate: string;
  chequeNumber: string | null;
  chequeBankName: string | null;
  chequeDate: string | null;
  amount: number;
  status: ChequeStatus | null;
  customer: Ref | null;
  collectedBy: CollectorRef;
  depositedInto: Ref | null;
  clearedInto: Ref | null;
  returnReason: string | null;
  commentCount: number;
}

interface CountTotal {
  count: number;
  total: number;
}

/** Over every cheque matching the filters, not just the page. */
export interface ChequeSummary {
  pendingCount: number;
  pendingTotal: number;
  /** Pending, cheque date within the next 7 days. */
  dueSoon: CountTotal;
  /** Not yet deposited, cheque date already past. */
  overdue: CountTotal;
  depositedPending: CountTotal;
}

export interface ChequePage {
  items: ChequeRow[];
  page: number;
  pageSize: number;
  summary: ChequeSummary;
}

/** The register's tabs; each is one backend status. */
export type ChequeTab =
  | "with_salesman"
  | "at_office"
  | "deposited"
  | "cleared"
  | "returned";

export interface ChequeFilters {
  tab: ChequeTab;
  q: string;
  /** Cheque date range, YYYY-MM-DD. */
  dueFrom: string;
  dueTo: string;
  customerId: string;
  bank: string;
  collectedBy: string;
  page: number;
}
