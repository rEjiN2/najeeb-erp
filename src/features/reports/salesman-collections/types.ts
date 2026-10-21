import type { VoucherFilters } from "@/features/vouchers/filters";
import type { PaymentMethod, VoucherStatus } from "@/features/vouchers/types";

// Mirrors the backend's reports module (salesman-collections.service.ts).
// Dates arrive as ISO strings.

type Ref = { id: string; name: string | null };

export interface SalesmanCollectionFigures {
  /** Receipts in the range (cancelled excluded). */
  receipts: number;
  /** Into cash or wallet accounts. */
  collectedCash: number;
  /** Into cheque accounts. */
  collectedCheque: number;
  /** Into bank accounts. */
  collectedBank: number;
  /** Cash + cheque + bank: matches the receipts list total for the same dates and collector. */
  total: number;
  /** Received on handovers approved in the range. */
  handedOver: number;
  /** Submitted on handovers awaiting approval now. */
  pendingApproval: number;
  /** Current balance of the user's own cash, wallet and cheque accounts. */
  withSalesman: number;
}

export interface SalesmanCollectionRow extends SalesmanCollectionFigures {
  /** The Collected By user. */
  staff: { id: string; name: string; status: string; location: Ref | null };
}

/** GET /reports/salesman-collections. */
export interface SalesmanCollectionsReport {
  dateFrom: string | null;
  dateTo: string | null;
  rows: SalesmanCollectionRow[];
  totals: SalesmanCollectionFigures;
}

/** GET /reports/salesman-collections/:userId. */
export interface SalesmanCollectionDetails {
  row: SalesmanCollectionRow;
  receipts: {
    id: string;
    voucherNo: string;
    date: string;
    account: Ref;
    paymentMethod: PaymentMethod;
    paymentReference: string | null;
    amount: number;
  }[];
  handovers: {
    id: string;
    voucherNo: string;
    date: string;
    status: VoucherStatus;
    submittedTotal: number;
    receivedTotal: number | null;
    approvedAt: string | null;
  }[];
}

export interface SalesmanCollectionsFilters extends Pick<
  VoucherFilters,
  "range" | "from" | "to"
> {
  userId: string;
}
