import { parseRecords } from "@/features/opening-balances/csv";

/** One CSV row as typed: the product code, quantity and optional unit cost. */
export interface StockImportRow {
  /** 1-based line in the file, for messages. */
  line: number;
  code: string;
  qty: number;
  unitCost: number | null;
  /** Set when the row can't even be sent (e.g. "abc" as a quantity). */
  problem: string | null;
}

/** "1,234.5" → number; blank → null; anything else → NaN. */
function number(raw: string | undefined, decimals: number): number | null {
  const text = (raw ?? "").replace(/[\s,]/g, "");
  if (text === "") return null;
  return new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(text)
    ? Number(text)
    : Number.NaN;
}

/**
 * Columns code, qty, unitCost. A header row is used to find them (any order,
 * any case); without one they are taken in that order. Blank lines are
 * skipped. Excel's UTF-8 BOM is dropped.
 */
export function parseOpeningStockCsv(text: string): StockImportRow[] {
  const records = parseRecords(text.replace(/^﻿/, ""));
  if (records.length === 0) return [];

  const header = records[0]!.map((cell) => cell.trim().toLowerCase());
  const hasHeader = header.includes("code");
  const column = (names: string[], fallback: number) =>
    hasHeader ? header.findIndex((cell) => names.includes(cell)) : fallback;
  const codeAt = column(["code"], 0);
  const qtyAt = column(["qty", "quantity"], 1);
  const costAt = column(["unitcost", "unit cost", "cost"], 2);

  const rows: StockImportRow[] = [];
  records.forEach((record, index) => {
    if (hasHeader && index === 0) return;
    if (record.every((cell) => cell.trim() === "")) return;
    const code = (record[codeAt] ?? "").trim();
    const qty = qtyAt >= 0 ? number(record[qtyAt], 3) : null;
    const unitCost = costAt >= 0 ? number(record[costAt], 2) : null;
    rows.push({
      line: index + 1,
      code,
      qty: qty === null || Number.isNaN(qty) ? 0 : qty,
      unitCost: unitCost === null || Number.isNaN(unitCost) ? null : unitCost,
      problem: !code
        ? "No product code"
        : qty === null || Number.isNaN(qty)
          ? "Quantity must be a number with up to 3 decimals"
          : Number.isNaN(unitCost)
            ? "Unit cost must be a number with up to 2 decimals"
            : null,
    });
  });
  return rows;
}
