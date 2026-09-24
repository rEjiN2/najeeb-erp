import type { CashReceiptVoucher, LedgerAccount } from "./types";

const TODAY = "2026-09-21";

// Party ledgers cash can be received against — same businesses as the
// dashboard's Party Balances widget, for continuity.
export const PARTY_LEDGER_ACCOUNTS: LedgerAccount[] = [
  { id: "party-al-maha", name: "Al Maha Trading LLC", outstanding: 128_400 },
  { id: "party-deira", name: "Deira Wholesale Co.", outstanding: 96_750 },
  { id: "party-barakah", name: "Barakah Foods", outstanding: 74_200 },
  { id: "party-gulf-fresh", name: "Gulf Fresh Mart", outstanding: 58_900 },
  { id: "party-al-noor", name: "Al Noor Supermarket", outstanding: 41_300 },
  { id: "party-sharjah", name: "Sharjah Dates Depot", outstanding: 27_650 },
  { id: "party-ajman", name: "Ajman Retail Group", outstanding: 15_100 },
  { id: "party-emirates", name: "Emirates Grocers", outstanding: 9_200 },
];

export const CASH_ACCOUNTS: LedgerAccount[] = [
  { id: "cash-main-store", name: "Cash in Hand - Main Store", outstanding: 0 },
  { id: "cash-van-1", name: "Cash in Hand - Van 1", outstanding: 0 },
  { id: "cash-van-2", name: "Cash in Hand - Van 2", outstanding: 0 },
  { id: "bank-adcb", name: "Bank - ADCB Current A/C", outstanding: 0 },
  { id: "bank-enbd", name: "Bank - ENBD Current A/C", outstanding: 0 },
];

export const CASHIERS = [
  { id: "cashier-rafiq", name: "Mohammed Rafiq" },
  { id: "cashier-sara", name: "Sara Ali" },
  { id: "cashier-imran", name: "Imran Sheikh" },
];

export const MOCK_CASH_RECEIPTS: CashReceiptVoucher[] = [
  {
    id: "cr-1001",
    voucherNo: "CR-1001",
    voucherDate: "2026-09-15",
    cashAccountId: "cash-main-store",
    cashierId: "cashier-rafiq",
    comments: "Partial settlement against outstanding invoices.",
    lines: [
      {
        id: "cr-1001-l1",
        accountId: "party-al-maha",
        accountName: "Al Maha Trading LLC",
        narration: "Against invoice #INV-2231",
        remarks: "Paid by cash",
        oldBalance: 128_400,
        amount: 40_000,
        vat: 2_000,
      },
      {
        id: "cr-1001-l2",
        accountId: "party-deira",
        accountName: "Deira Wholesale Co.",
        narration: "Advance for next delivery",
        remarks: "",
        oldBalance: 96_750,
        amount: 15_000,
        vat: 750,
      },
    ],
  },
  {
    id: "cr-1002",
    voucherNo: "CR-1002",
    voucherDate: "2026-09-18",
    cashAccountId: "bank-adcb",
    cashierId: "cashier-sara",
    comments: "",
    lines: [
      {
        id: "cr-1002-l1",
        accountId: "party-al-noor",
        accountName: "Al Noor Supermarket",
        narration: "Full settlement",
        remarks: "Cheque deposited",
        oldBalance: 41_300,
        amount: 41_300,
        vat: 0,
      },
    ],
  },
];

export function nextCashReceiptNo(vouchers: CashReceiptVoucher[]): string {
  const numbers = vouchers.map((voucher) => {
    const match = /CR-(\d+)/.exec(voucher.voucherNo);
    return match ? Number(match[1]) : 0;
  });
  const next = (numbers.length > 0 ? Math.max(...numbers) : 1000) + 1;
  return `CR-${next}`;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createBlankCashReceipt(voucherNo: string): CashReceiptVoucher {
  return {
    id: createId(),
    voucherNo,
    voucherDate: TODAY,
    cashAccountId: "",
    cashierId: "",
    comments: "",
    lines: [],
  };
}
