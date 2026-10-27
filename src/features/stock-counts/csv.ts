import { parseRecords } from "@/features/opening-balances/csv";

/** One CSV row as typed: the product code and counted quantity. */
export interface CountImportRow {
  /** 1-based line in the file, for messages. */
  line: number;
  code: string;
  countedQty: number;
  /** Set when the row can't even be sent (e.g. "abc" as a quantity). */
  problem: string | null;
}

/**
 * Columns code, counted qty. A header row is used to find them (any order,
 * any case); without one they are taken in that order. Blank lines are
 * skipped. Excel's UTF-8 BOM is dropped.
 */
export function parseStockCountCsv(text: string): CountImportRow[] {
  const records = parseRecords(text.replace(/^﻿/, ""));
  if (records.length === 0) return [];

  const header = records[0]!.map((cell) => cell.trim().toLowerCase());
  const hasHeader = header.includes("code");
  const codeAt = hasHeader ? header.indexOf("code") : 0;
  const qtyAt = hasHeader
    ? header.findIndex((cell) =>
        ["counted qty", "countedqty", "counted", "qty", "quantity"].includes(
          cell,
        ),
      )
    : 1;

  const rows: CountImportRow[] = [];
  records.forEach((record, index) => {
    if (hasHeader && index === 0) return;
    if (record.every((cell) => cell.trim() === "")) return;
    const code = (record[codeAt] ?? "").trim();
    const raw = qtyAt >= 0 ? (record[qtyAt] ?? "").replace(/[\s,]/g, "") : "";
    const valid = /^\d+(\.\d{1,3})?$/.test(raw);
    rows.push({
      line: index + 1,
      code,
      countedQty: valid ? Number(raw) : 0,
      problem: !code
        ? "No product code"
        : valid
          ? null
          : "Counted qty must be a number, 0 or more, up to 3 decimals",
    });
  });
  return rows;
}
