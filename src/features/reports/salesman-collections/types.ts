import type { VoucherFilters } from "@/features/vouchers/filters";
import type { PaymentMethod } from "@/features/vouchers/types";

// Mirrors the backend's reports module (salesman-collections.service.ts).
// Dates arrive as ISO strings.

type Ref = { id: string; name: string | null };

export interface SalesmanCollectionFigures {
  /** Cash collected minus cash handed over before the range. */
  openingPending: number;
  /** Receipts into cash or wallet accounts in the range. */
  collectedCash: number;
  /** Receipts into bank accounts in the range: shown, never pending. */
  collectedBank: number;
  /** Handovers this cashier handed over in the range. */
  handedOver: number;
  /** openingPending + collectedCash - handedOver. */
  closingPending: number;
  /** Receipts in the range, cash and bank. */
  receiptCount: number;
  handoverCount: number;
}

export interface SalesmanCollectionRow extends SalesmanCollectionFigures {
  cashier: {
    id: string;
    code: string;
    name: string;
    status: string;
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
    /** Cash/wallet receipts count towards pending; bank ones don't. */
    countsAsPending: boolean;
  }[];
  handovers: {
    id: string;
    voucherNo: string;
    date: string;
    fromAccount: Ref;
    toAccount: Ref | null;
    receivedBy: Ref;
    amount: number;
  }[];
}

export interface SalesmanCollectionsFilters extends Pick<
  VoucherFilters,
  "range" | "from" | "to"
> {
  cashierId: string;
  locationId: string;
}
