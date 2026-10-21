import type { UserRef, VoucherStatus } from "@/features/vouchers/types";

// Mirrors the backend's cash-handovers module (dto/cash-handover.dto.ts,
// cash-handover.service.ts, schemas/cash-handover.schema.ts). Dates arrive
// as ISO strings.

export type HandoverStatus =
  "submitted" | "approved" | "rejected" | "cancelled";

type Ref = { id: string; name: string | null };

/** One GET /cash-handovers item (CashHandoverListRow). */
export interface HandoverListRow {
  id: string;
  voucherNo: string;
  date: string;
  user: Ref;
  status: VoucherStatus;
  submittedTotal: number;
  receivedTotal: number | null;
  itemCount: number;
  createdBy: UserRef | null;
  createdAt: string | null;
  commentCount: number;
}

/** GET /cash-handovers. summary.total: received on approved ones. */
export interface HandoverPage {
  items: HandoverListRow[];
  page: number;
  pageSize: number;
  summary: { count: number; total: number };
}

export interface HandoverFilters {
  status: HandoverStatus | "all";
  /** "" for anyone. */
  userId: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}

/** One of the user's own cash, wallet or cheque accounts (PendingAccount). */
export interface PendingAccount {
  accountId: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  /** Already on their other submitted handovers. */
  submitted: number;
  /** balance - submitted: the most this handover can take. */
  available: number;
}

/** GET /cash-handovers/pending. */
export interface PendingCash {
  user: Ref;
  accounts: PendingAccount[];
  totals: { balance: number; submitted: number; available: number };
}

/** One source account on a handover (HandoverLine). */
export interface HandoverItem {
  sourceAccountId: string;
  sourceAccountName: string;
  sourceAccountType: string;
  submittedAmount: number;
  receivedAmount: number | null;
  receivedIntoAccountId: string | null;
  receivedIntoAccountName: string | null;
}

/** The handover-only fields of GET /cash-handovers/:id. */
export interface HandoverWorkflow {
  userId: string | null;
  items: HandoverItem[];
  submittedTotal: number;
  receivedTotal: number | null;
  reason: string | null;
  approvedBy: UserRef | null;
  approvedAt: string | null;
  rejectedBy: UserRef | null;
  rejectedAt: string | null;
}

/** CreateCashHandoverDto. */
export interface HandoverInput {
  voucherDate: string;
  /** null: the signed-in user. */
  userId: string | null;
  lines: { sourceAccountId: string; amount: number }[];
  notes: string;
}

/** ApproveCashHandoverDto. */
export interface ApproveInput {
  lines: {
    sourceAccountId: string;
    receivedAmount: number;
    receivedIntoAccountId: string;
  }[];
  reason: string;
}
