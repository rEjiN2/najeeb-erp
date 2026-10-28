// Shapes of GET /reports/ledger | day-book | cash-book | trial-balance.

export interface LedgerRow {
  date: string;
  voucherType: string;
  voucherNo: string;
  voucherId: string;
  narration: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  /** Only with includeCancelled. */
  cancelled?: boolean;
  reversal?: boolean;
}

export interface LedgerReport {
  account: { id: string; code: string; name: string; type: string };
  opening: number;
  rows: LedgerRow[];
  totals: { debit: number; credit: number };
  closing: number;
  page: number;
  total: number;
}

export interface DayBookRow {
  date: string;
  type: string;
  no: string;
  voucherId: string;
  summary: string;
  amount: number;
  status: string;
  createdBy: { id: string; name: string } | null;
}

export interface DayBookReport {
  rows: DayBookRow[];
  totals: { type: string; count: number; amount: number }[];
  page: number;
  total: number;
}

export interface CashBookDay {
  date: string;
  opening: number;
  receipts: number;
  payments: number;
  closing: number;
}

export interface CashBookDetail {
  date: string;
  account: string;
  voucherType: string;
  voucherNo: string;
  narration: string | null;
  debit: number;
  credit: number;
  cancelled?: boolean;
}

export interface CashBookReport {
  accounts: { id: string; code: string; name: string; type: string }[];
  opening: number;
  daily: CashBookDay[];
  details: CashBookDetail[];
  closing: number;
}

export interface TrialBalanceLine {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  asOf: string;
  groups: {
    type: string;
    accounts: TrialBalanceLine[];
    debit: number;
    credit: number;
  }[];
  totals: { debit: number; credit: number };
}
