import type {
  SalesmanCollectionFigures,
  SalesmanCollectionsReport,
} from "./types";

const HEADERS = [
  "Collected By",
  "Location",
  "Receipts",
  "Cash",
  "Cheque",
  "Bank",
  "Total",
  "Handed Over",
  "Pending Approval",
  "With Salesman (now)",
];

/** RFC 4180: quote a field that holds a comma, quote or line break. */
export function field(value: string | number | null | undefined): string {
  const text =
    typeof value === "number"
      ? (Number.isFinite(value) ? value : 0).toFixed(2)
      : (value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function figures(f: SalesmanCollectionFigures): string[] {
  return [
    String(f.receipts ?? 0),
    field(f.collectedCash),
    field(f.collectedCheque),
    field(f.collectedBank),
    field(f.total),
    field(f.handedOver),
    field(f.pendingApproval),
    field(f.withSalesman),
  ];
}

/** The report as shown, with a totals row; amounts in AED, 2 decimals. */
export function toCsv(report: SalesmanCollectionsReport): string {
  const rows = (report.rows ?? []).map((row) => [
    field(row.staff?.name),
    field(row.staff?.location?.name),
    ...figures(row),
  ]);
  rows.push(["Total", "", ...figures(report.totals)]);
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
