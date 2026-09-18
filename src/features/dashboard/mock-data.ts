/**
 * Dashboard mock data — no backend yet. Everything here is a pure function
 * of a fixed seed/anchor date, so it's identical on server and client
 * (no hydration mismatch) and stable across re-renders.
 */

export type Period = "week" | "month" | "year";
export type PurchasePeriod = "day" | "month" | "year";

export interface FinancePoint {
  period: string;
  income: number;
  expense: number;
  profit: number;
}

export interface SinglePoint {
  period: string;
  value: number;
}

export interface SalesRecord {
  date: string; // ISO yyyy-mm-dd
  salesman: string;
  amount: number;
}

export interface PartyBalance {
  id: string;
  name: string;
  outstanding: number;
}

export interface SupplierBalance {
  id: string;
  name: string;
  /** Positive = they owe us. Negative = we owe them (typical for a supplier). */
  balance: number;
}

// Anchor "today" so labels read as recent without depending on the real
// clock (which would differ between server render and a later client read).
const ANCHOR = new Date("2026-09-18T00:00:00Z");

// Deterministic PRNG (mulberry32) — same seed always produces the same
// sequence, so mock data never "jumps" between renders.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getUTCDay();
  const diff = (day + 6) % 7; // Monday-start week
  return addDays(next, -diff);
}

const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});
const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});

function buildFinanceSeries(
  count: number,
  labelFor: (index: number) => string,
  baseIncome: number,
  seed: number,
): FinancePoint[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const growth = 1 + i * 0.012;
    const wobble = 0.85 + rand() * 0.3;
    const income = Math.round(baseIncome * growth * wobble);
    const expenseRatio = 0.58 + rand() * 0.14;
    const expense = Math.round(income * expenseRatio);
    return {
      period: labelFor(i),
      income,
      expense,
      profit: income - expense,
    };
  });
}

export const FINANCE_DATA: Record<Period, FinancePoint[]> = {
  week: buildFinanceSeries(
    12,
    (i) => dayLabel.format(addDays(startOfWeek(ANCHOR), (i - 11) * 7)),
    62_000,
    11,
  ),
  month: buildFinanceSeries(
    12,
    (i) => monthLabel.format(addMonths(ANCHOR, i - 11)),
    240_000,
    22,
  ),
  year: buildFinanceSeries(
    5,
    (i) => String(ANCHOR.getUTCFullYear() - (4 - i)),
    2_450_000,
    33,
  ),
};

function buildSingleSeries(
  count: number,
  labelFor: (index: number) => string,
  base: number,
  seed: number,
  weekendDip = false,
): SinglePoint[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const wobble = 0.8 + rand() * 0.4;
    let value = base * wobble;
    if (weekendDip) {
      // UAE weekend — Friday/Saturday run quieter.
      const date = addDays(ANCHOR, i - (count - 1));
      const day = date.getUTCDay();
      if (day === 5 || day === 6) value *= 0.45;
    }
    return { period: labelFor(i), value: Math.round(value) };
  });
}

export const PURCHASE_DATA: Record<PurchasePeriod, SinglePoint[]> = {
  day: buildSingleSeries(
    14,
    (i) => dayLabel.format(addDays(ANCHOR, i - 13)),
    18_500,
    44,
    true,
  ),
  month: buildSingleSeries(
    12,
    (i) => monthLabel.format(addMonths(ANCHOR, i - 11)),
    145_000,
    55,
  ),
  year: buildSingleSeries(
    5,
    (i) => String(ANCHOR.getUTCFullYear() - (4 - i)),
    1_520_000,
    66,
  ),
};

export const SALESMEN = [
  "Ahmed Khan",
  "Fatima Noor",
  "Ravi Shankar",
  "Youssef Ali",
] as const;

function buildSalesRecords(): SalesRecord[] {
  const rand = mulberry32(77);
  const records: SalesRecord[] = [];
  const days = 90;

  for (let i = 0; i < days; i++) {
    const date = addDays(ANCHOR, i - (days - 1));
    const iso = date.toISOString().slice(0, 10);
    const day = date.getUTCDay();
    const weekendFactor = day === 5 || day === 6 ? 0.5 : 1;

    for (const salesman of SALESMEN) {
      const base = 3200 + rand() * 2600;
      const amount = Math.round(base * weekendFactor);
      records.push({ date: iso, salesman, amount });
    }
  }

  return records;
}

export const SALES_RECORDS: SalesRecord[] = buildSalesRecords();

export const PARTY_BALANCES: PartyBalance[] = [
  { id: "p1", name: "Al Maha Trading LLC", outstanding: 128_400 },
  { id: "p2", name: "Deira Wholesale Co.", outstanding: 96_750 },
  { id: "p3", name: "Barakah Foods", outstanding: 74_200 },
  { id: "p4", name: "Gulf Fresh Mart", outstanding: 58_900 },
  { id: "p5", name: "Al Noor Supermarket", outstanding: 41_300 },
  { id: "p6", name: "Sharjah Dates Depot", outstanding: 27_650 },
  { id: "p7", name: "Ajman Retail Group", outstanding: 15_100 },
  { id: "p8", name: "Emirates Grocers", outstanding: 9_200 },
];

export const SUPPLIER_BALANCES: SupplierBalance[] = [
  { id: "s1", name: "Al Ain Date Farms", balance: -142_000 },
  { id: "s2", name: "Liwa Oasis Growers", balance: -88_400 },
  { id: "s3", name: "Madinah Premium Dates", balance: -63_250 },
  { id: "s4", name: "Qassim Agri Trading", balance: -34_900 },
  { id: "s5", name: "Al Hofuf Packing House", balance: 12_600 },
  { id: "s6", name: "Saudi Date Exporters Co.", balance: -8_750 },
];

export const CASH_SUMMARY = {
  bank: 482_600,
  hand: 36_150,
  previousTotal: 497_800,
};
