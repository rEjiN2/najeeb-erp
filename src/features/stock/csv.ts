import { field } from "@/features/reports/salesman-collections/csv";
import { toDateInputValue } from "@/lib/datetime";

import { voucherTypeLabel } from "./constants";
import type { StockHistory } from "./types";

const HEADERS = [
  "Date",
  "Voucher Type",
  "Voucher No",
  "Location",
  "In",
  "Out",
  "Running Balance",
  "By",
];

/** Quantities as typed (up to 3 decimals), not money-formatted. */
const qty = (value: number) => String(value);

/** The opening line, one line per entry, then the closing balance. */
export function stockHistoryToCsv(history: StockHistory): string {
  const lines = [
    ["", "Opening balance", "", "", "", "", qty(history.opening), ""],
    ...history.items.map((entry) => [
      toDateInputValue(entry.date),
      field(
        `${voucherTypeLabel(entry.voucherType)}${entry.isReversal ? " (reversal)" : ""}`,
      ),
      field(entry.voucherNo),
      field(entry.location.name),
      entry.in ? qty(entry.in) : "",
      entry.out ? qty(entry.out) : "",
      qty(entry.balance),
      field(entry.by?.name),
    ]),
    ["", "Closing balance", "", "", "", "", qty(history.closing), ""],
  ];
  return [HEADERS, ...lines].map((line) => line.join(",")).join("\r\n");
}
