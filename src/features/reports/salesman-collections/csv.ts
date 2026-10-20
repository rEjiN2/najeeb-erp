import type {
  SalesmanCollectionFigures,
  SalesmanCollectionsReport,
} from "./types";

const HEADERS = [
  "Staff Code",
  "Staff",
  "Location",
  "Opening Unsettled",
  "Collected Cash",
  "Collected Bank",
  "Pending Approval",
  "Settled",
  "Shortage",
  "Closing Unsettled",
  "Receipts",
  "Handovers",
];

/** RFC 4180: quote a field that holds a comma, quote or line break. */
function field(value: string | number): string {
  const text = typeof value === "number" ? value.toFixed(2) : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const count = (value: number) => String(value);

function figures(f: SalesmanCollectionFigures): string[] {
  return [
    field(f.unsettledOpening),
    field(f.collectedCash),
    field(f.collectedBank),
    field(f.pendingApproval),
    field(f.settled),
    field(f.openShortage),
    field(f.unsettledClosing),
    count(f.receiptCount),
    count(f.handoverCount),
  ];
}

/** The report as shown, with a totals row; amounts in AED, 2 decimals. */
export function toCsv(report: SalesmanCollectionsReport): string {
  const rows = report.rows.map((row) => [
    field(row.cashier.code),
    field(row.cashier.name),
    field(row.cashier.location?.name ?? ""),
    ...figures(row),
  ]);
  rows.push(["", "Total", "", ...figures(report.totals)]);
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
