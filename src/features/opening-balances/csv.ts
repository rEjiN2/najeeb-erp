/** One CSV row as typed: the account code and its amounts. */
export interface ImportRow {
  /** 1-based line in the file, for messages. */
  line: number;
  code: string;
  debit: number;
  credit: number;
  /** Set when the row can't even be sent (e.g. "abc" as an amount). */
  problem: string | null;
}

/** RFC 4180 fields: quotes, doubled quotes, commas and line breaks in quotes. */
export function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

/** "1,234.50" or " 300 " → number; blank → 0; anything else → NaN. */
function amount(raw: string | undefined): number {
  const text = (raw ?? "").replace(/[\s,]/g, "");
  if (text === "") return 0;
  return /^\d+(\.\d{1,2})?$/.test(text) ? Number(text) : Number.NaN;
}

/**
 * Columns code, debit, credit. A header row is used to find them (any order,
 * any case); without one they are taken in that order. Blank lines are
 * skipped. Excel's UTF-8 BOM is dropped.
 */
export function parseOpeningBalanceCsv(text: string): ImportRow[] {
  const records = parseRecords(text.replace(/^﻿/, ""));
  if (records.length === 0) return [];

  const header = records[0]!.map((cell) => cell.trim().toLowerCase());
  const hasHeader = header.includes("code");
  const column = (name: string, fallback: number) =>
    hasHeader ? header.indexOf(name) : fallback;
  const [codeAt, debitAt, creditAt] = [
    column("code", 0),
    column("debit", 1),
    column("credit", 2),
  ];

  const rows: ImportRow[] = [];
  records.forEach((record, index) => {
    if (hasHeader && index === 0) return;
    if (record.every((cell) => cell.trim() === "")) return;
    const code = (record[codeAt] ?? "").trim();
    const debit = debitAt >= 0 ? amount(record[debitAt]) : 0;
    const credit = creditAt >= 0 ? amount(record[creditAt]) : 0;
    rows.push({
      line: index + 1,
      code,
      debit: Number.isNaN(debit) ? 0 : debit,
      credit: Number.isNaN(credit) ? 0 : credit,
      problem: !code
        ? "No account code"
        : Number.isNaN(debit) || Number.isNaN(credit)
          ? "Amounts must be numbers with up to 2 decimals"
          : null,
    });
  });
  return rows;
}
