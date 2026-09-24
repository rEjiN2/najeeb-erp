export interface CashReceiptLine {
  id: string;
  accountId: string;
  accountName: string;
  narration: string;
  remarks: string;
  /** Snapshot of the account's outstanding balance at the time it was picked. */
  oldBalance: number;
  amount: number;
  vat: number;
}

export interface CashReceiptVoucher {
  id: string;
  voucherNo: string;
  voucherDate: string; // ISO yyyy-mm-dd
  cashAccountId: string;
  cashierId: string;
  comments: string;
  lines: CashReceiptLine[];
}

export interface LedgerAccount {
  id: string;
  name: string;
  outstanding: number;
}
