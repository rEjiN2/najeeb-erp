import type { VoucherColumn } from "@/components/voucher/voucher-line-grid";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

import type { CashReceiptLine } from "./types";

function toNumber(raw: string): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export const CASH_RECEIPT_COLUMNS: VoucherColumn<CashReceiptLine>[] = [
  {
    key: "account",
    header: "Account",
    render: (line) => <span className="font-medium">{line.accountName}</span>,
  },
  {
    key: "narration",
    header: "Narration",
    render: (line, { update }) => (
      <Input
        value={line.narration}
        onChange={(event) => update({ narration: event.target.value })}
        placeholder="Narration"
        className="min-w-40"
      />
    ),
  },
  {
    key: "remarks",
    header: "Remarks",
    render: (line, { update }) => (
      <Input
        value={line.remarks}
        onChange={(event) => update({ remarks: event.target.value })}
        placeholder="Remarks"
        className="min-w-32"
      />
    ),
  },
  {
    key: "oldBalance",
    className: "text-right",
    header: "Old Balance",
    render: (line) => (
      <span className="text-muted-foreground font-mono text-sm tabular-nums">
        {formatCurrency(line.oldBalance)}
      </span>
    ),
  },
  {
    key: "amount",
    className: "text-right",
    header: "Amount",
    render: (line, { update }) => (
      <Input
        type="number"
        inputMode="decimal"
        value={line.amount}
        onChange={(event) => update({ amount: toNumber(event.target.value) })}
        className="w-28 text-right font-mono tabular-nums"
      />
    ),
  },
  {
    key: "vat",
    className: "text-right",
    header: "VAT",
    render: (line, { update }) => (
      <Input
        type="number"
        inputMode="decimal"
        value={line.vat}
        onChange={(event) => update({ vat: toNumber(event.target.value) })}
        className="w-24 text-right font-mono tabular-nums"
      />
    ),
  },
  {
    key: "netAmount",
    className: "text-right",
    header: "Net Amount",
    render: (line) => (
      <span className="font-mono text-sm font-semibold tabular-nums">
        {formatCurrency(line.amount + line.vat)}
      </span>
    ),
  },
];

export function computeCashReceiptTotals(lines: CashReceiptLine[]) {
  const gross = lines.reduce((sum, line) => sum + line.amount, 0);
  const tax = lines.reduce((sum, line) => sum + line.vat, 0);
  return { gross, tax, grandTotal: gross + tax };
}
