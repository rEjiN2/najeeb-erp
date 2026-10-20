import type {
  NamedRef,
  PaymentMethod,
  VoucherStatus,
} from "@/features/vouchers/types";

// Mirrors the backend's cash-handovers module (dto/cash-handover.dto.ts,
// cash-handover.service.ts, schemas/cash-handover.schema.ts).

/** What the submit form sends (CreateCashHandoverDto). */
export interface HandoverInput {
  voucherDate: string;
  /** null for an "own"-scoped user: the backend uses their linked staff. */
  staffId: string | null;
  sourceAccountId: string;
  receiptIds: string[];
  countedCash: number;
  notes: string;
}

/** ApproveCashHandoverDto. */
export interface ApproveInput {
  receivedCash: number;
  receivedIntoAccountId: string;
  varianceReason: string;
}

/** One GET /cash-handovers/unsettled receipt. */
export interface UnsettledReceipt {
  id: string;
  voucherNo: string;
  date: string;
  /** The account it was received into. */
  account: NamedRef;
  paymentMethod: PaymentMethod;
  amount: number;
}

/** GET /cash-handovers/unsettled. */
export interface UnsettledReceipts {
  receipts: UnsettledReceipt[];
  totals: { cash: number; bank: number };
}

/** A receipt on a handover, as it was when submitted. */
export interface HandoverReceipt {
  receiptId: string;
  voucherNo: string;
  voucherDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
}

/** The workflow fields of GET /cash-handovers/:id. */
export interface HandoverDetail {
  id: string;
  status: VoucherStatus;
  sourceAccountId: string;
  receipts: HandoverReceipt[];
  expectedCash: number;
  bankTotal: number;
  countedCash: number | null;
  receivedCash: number | null;
  varianceReason: string | null;
}
