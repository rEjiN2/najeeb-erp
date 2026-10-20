import type { VoucherFilters } from "@/features/vouchers/filters";
import type { StaffType } from "@/features/cashiers/types";
import type { PaymentMethod, VoucherStatus } from "@/features/vouchers/types";

// Mirrors the backend's reports module (salesman-collections.service.ts).
// Dates arrive as ISO strings.

type Ref = { id: string; name: string | null };

export interface SalesmanCollectionFigures {
  /** Cash receipts dated before the range and not settled by then. */
  unsettledOpening: number;
  /** Receipts into cash or wallet accounts in the range. */
  collectedCash: number;
  /** Receipts into bank accounts in the range: verified on handover, never unsettled. */
  collectedBank: number;
  /** Expected cash on submitted handovers awaiting approval. */
  pendingApproval: number;
  /** Cash received on handovers approved in the range. */
  settled: number;
  /** Expected minus received on approved handovers: still in the van account. */
  openShortage: number;
  /** Cash receipts not settled by the end of the range (pending approval included). */
  unsettledClosing: number;
  /** Receipts in the range, cash and bank. */
  receiptCount: number;
  /** Submitted or approved handovers in the range. */
  handoverCount: number;
}

export interface SalesmanCollectionRow extends SalesmanCollectionFigures {
  cashier: {
    id: string;
    code: string;
    name: string;
    status: string;
    staffType: StaffType;
    location: Ref | null;
  };
}

/** GET /reports/salesman-collections. */
export interface SalesmanCollectionsReport {
  dateFrom: string | null;
  dateTo: string | null;
  rows: SalesmanCollectionRow[];
  totals: SalesmanCollectionFigures;
}

/** GET /reports/salesman-collections/:cashierId. */
export interface SalesmanCollectionDetails {
  row: SalesmanCollectionRow;
  receipts: {
    id: string;
    voucherNo: string;
    date: string;
    account: Ref;
    paymentMethod: PaymentMethod;
    amount: number;
    /** null on receipts of staff who don't settle with the office. */
    settlementStatus: "unsettled" | "submitted" | "settled" | null;
    handover: { id: string; voucherNo: string | null } | null;
  }[];
  handovers: {
    id: string;
    voucherNo: string;
    date: string;
    status: VoucherStatus;
    sourceAccount: Ref;
    receivedInto: Ref | null;
    expectedCash: number;
    bankTotal: number;
    receivedCash: number | null;
    shortage: number;
    approvedAt: string | null;
  }[];
}

export interface SalesmanCollectionsFilters extends Pick<
  VoucherFilters,
  "range" | "from" | "to"
> {
  cashierId: string;
  locationId: string;
}
