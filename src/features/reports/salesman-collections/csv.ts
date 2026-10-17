import type { SalesmanCollectionsReport } from "./types";

const HEADERS = [
  "Cashier Code",
  "Cashier",
  "Location",
  "Opening Pending",
  "Collected Cash",
  "Collected Bank",
  "Handed Over",
  "Closing Pending",
  "Receipts",
  "Handovers",
];

/** RFC 4180: quote a field that holds a comma, quote or line break. */
function field(value: string | number): string {
  const text = typeof value === "number" ? value.toFixed(2) : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const count = (value: number) => String(value);

/** The report as shown, with a totals row; amounts in AED, 2 decimals. */
export function toCsv(report: SalesmanCollectionsReport): string {
  const rows = report.rows.map((row) => [
    field(row.cashier.code),
    field(row.cashier.name),
    field(row.cashier.location?.name ?? ""),
    field(row.openingPending),
    field(row.collectedCash),
    field(row.collectedBank),
    field(row.handedOver),
    field(row.closingPending),
    count(row.receiptCount),
    count(row.handoverCount),
  ]);
  const t = report.totals;
  rows.push([
    "",
    "Total",
    "",
    field(t.openingPending),
    field(t.collectedCash),
    field(t.collectedBank),
    field(t.handedOver),
    field(t.closingPending),
    count(t.receiptCount),
    count(t.handoverCount),
  ]);
  return [HEADERS, ...rows].map((line) => line.join(",")).join("\r\n");
}

/** Saves the CSV; the BOM makes Excel read it as UTF-8 (Arabic names). */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
