import { field } from "@/features/reports/salesman-collections/csv";
import { toDateInputValue } from "@/lib/datetime";

import { CHEQUE_STATUS_LABELS } from "./cheque-status-badge";
import type { ChequeRow } from "./types";

const HEADERS = [
  "Cheque No",
  "Cheque Date",
  "Bank",
  "Amount",
  "Status",
  "Customer",
  "Receipt",
  "Receipt Date",
  "Collected By",
  "Deposited Into",
  "Cleared Into",
  "Return Reason",
];

const day = (value: string | null) => (value ? toDateInputValue(value) : "");

/** One line per cheque; amounts in AED, 2 decimals. */
export function chequesToCsv(rows: ChequeRow[]): string {
  const lines = rows.map((row) =>
    [
      field(row.chequeNumber),
      day(row.chequeDate),
      field(row.chequeBankName),
      field(row.amount),
      field(row.status ? CHEQUE_STATUS_LABELS[row.status] : ""),
      field(row.customer?.name),
      field(row.voucherNo),
      day(row.receiptDate),
      field(row.collectedBy.name),
      field(row.depositedInto?.name),
      field(row.clearedInto?.name),
      field(row.returnReason),
    ].join(","),
  );
  return [HEADERS.join(","), ...lines].join("\r\n");
}
