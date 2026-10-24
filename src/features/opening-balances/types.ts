import type { DatePreset } from "@/features/vouchers/filters";
import type { UserRef, VoucherStatus } from "@/features/vouchers/types";

// The backend's opening-balances module (opening-balance.service.ts,
// dto/opening-balance.dto.ts). Dates arrive as ISO strings.

/** GET /opening-balances item (OpeningBalanceListRow). */
export interface OpeningBalanceRow {
  id: string;
  voucherNo: string;
  asOfDate: string;
  lineCount: number;
  totalDebit: number;
  totalCredit: number;
  /** The balancing entry to Opening Balance Equity; one of them is 0. */
  equityDebit: number;
  equityCredit: number;
  status: VoucherStatus;
  createdBy: UserRef | null;
  createdAt: string | null;
  updatedBy: UserRef | null;
  updatedAt: string | null;
  commentCount: number;
}

export interface OpeningBalancePage {
  items: OpeningBalanceRow[];
  page: number;
  pageSize: number;
  summary: { count: number; total: number };
}

export interface OpeningBalanceFilters {
  range: DatePreset;
  from: string;
  to: string;
  status: "all" | "posted" | "cancelled";
  accountId: string;
  page: number;
}

/** One account's line, with the account resolved. */
export interface OpeningBalanceLine {
  accountId: string;
  code: string | null;
  name: string | null;
  type: string | null;
  debit: number;
  credit: number;
}

/** CheckedLine / RowError from POST /opening-balances/validate. */
export interface CheckedLine {
  row: number;
  accountCode: string | null;
  accountId: string | null;
  accountName: string | null;
  accountType: string | null;
  debit: number;
  credit: number;
}

export interface RowError {
  row: number;
  accountCode: string | null;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  lines: CheckedLine[];
  errors: RowError[];
  totalDebit: number;
  totalCredit: number;
  equityDebit: number;
  equityCredit: number;
}

/** What the form submits. */
export interface OpeningBalanceInput {
  asOfDate: string;
  comments: string;
  lines: { accountId: string; debit: number; credit: number }[];
}
