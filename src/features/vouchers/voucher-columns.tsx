import { Input } from "@/components/ui/input";
import type { VoucherColumn } from "@/components/voucher/voucher-line-grid";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { parseMoney, type DraftErrors, type DraftLine } from "./form/draft";
import type { VoucherLine } from "./types";

function AccountName({ name }: { name: string | null }) {
  return name ? (
    <span className="font-medium">{name}</span>
  ) : (
    <span className="text-muted-foreground italic">Unknown account</span>
  );
}

function Money({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <span
      className={cn(
        "font-mono text-sm tabular-nums",
        strong ? "font-semibold" : "text-muted-foreground",
      )}
    >
      {formatAmount(value)}
    </span>
  );
}

interface ColumnOptions {
  /** Off when the user can't see balances (the backend leaves them out). */
  showOldBalance: boolean;
  /** Account and amount only (see VoucherConfig.simpleLines). */
  simpleLines?: boolean;
}

const LINE_DETAIL_KEYS = ["narration", "remarks", "vat", "netAmount"];

function withoutOldBalance<T>(
  columns: VoucherColumn<T>[],
  { showOldBalance, simpleLines = false }: ColumnOptions,
): VoucherColumn<T>[] {
  return columns.filter(
    (column) =>
      (showOldBalance || column.key !== "oldBalance") &&
      (!simpleLines || !LINE_DETAIL_KEYS.includes(column.key)),
  );
}

/** Editable grid for the create/edit form. */
export function editColumns(
  errors: Pick<DraftErrors, "lineAmount" | "lineVat">,
  options: ColumnOptions,
): VoucherColumn<DraftLine>[] {
  return withoutOldBalance<DraftLine>(
    [
      {
        key: "account",
        header: "Account",
        render: (line) => <AccountName name={line.accountName} />,
      },
      {
        key: "narration",
        header: "Narration",
        render: (line, { update }) => (
          <Input
            value={line.narration}
            onChange={(event) => update({ narration: event.target.value })}
            placeholder="Narration"
            aria-label={`Narration for ${line.accountName ?? "line"}`}
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
            aria-label={`Remarks for ${line.accountName ?? "line"}`}
            className="min-w-32"
          />
        ),
      },
      {
        key: "oldBalance",
        header: "Old Balance",
        className: "text-right",
        render: (line) =>
          line.oldBalance === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <Money value={line.oldBalance} />
          ),
      },
      {
        key: "amount",
        header: "Amount",
        className: "text-right",
        render: (line, { update }) => (
          <Input
            inputMode="decimal"
            value={line.amount}
            onChange={(event) => update({ amount: event.target.value })}
            placeholder="0.00"
            aria-label={`Amount for ${line.accountName ?? "line"}`}
            aria-invalid={errors.lineAmount[line.id] ? true : undefined}
            title={errors.lineAmount[line.id]}
            className="ml-auto w-28 text-right font-mono tabular-nums"
          />
        ),
      },
      {
        key: "vat",
        header: "VAT",
        className: "text-right",
        render: (line, { update }) => (
          <Input
            inputMode="decimal"
            value={line.vat}
            onChange={(event) => update({ vat: event.target.value })}
            placeholder="0.00"
            aria-label={`VAT for ${line.accountName ?? "line"}`}
            aria-invalid={errors.lineVat[line.id] ? true : undefined}
            title={errors.lineVat[line.id]}
            className="ml-auto w-24 text-right font-mono tabular-nums"
          />
        ),
      },
      {
        key: "netAmount",
        header: "Net Amount",
        className: "text-right",
        render: (line) => {
          const amount = parseMoney(line.amount, true);
          const vat = parseMoney(line.vat, true);
          return Number.isNaN(amount) || Number.isNaN(vat) ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <Money value={amount + vat} strong />
          );
        },
      },
    ],
    options,
  );
}

type ViewLine = VoucherLine & { id: string };

/** Read-only grid for the view page. */
const VIEW_COLUMNS: VoucherColumn<ViewLine>[] = [
  {
    key: "account",
    header: "Account",
    render: (line) => <AccountName name={line.accountName} />,
  },
  {
    key: "narration",
    header: "Narration",
    render: (line) =>
      line.narration || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "remarks",
    header: "Remarks",
    render: (line) =>
      line.remarks || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "oldBalance",
    header: "Old Balance",
    className: "text-right",
    render: (line) =>
      line.oldBalance === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <Money value={line.oldBalance} />
      ),
  },
  {
    key: "amount",
    header: "Amount",
    className: "text-right",
    render: (line) => <Money value={line.amount} strong />,
  },
  {
    key: "vat",
    header: "VAT",
    className: "text-right",
    render: (line) => <Money value={line.vat} />,
  },
  {
    key: "netAmount",
    header: "Net Amount",
    className: "text-right",
    render: (line) => <Money value={line.netAmount} strong />,
  },
];

export function viewColumns(options: ColumnOptions): VoucherColumn<ViewLine>[] {
  return withoutOldBalance(VIEW_COLUMNS, options);
}
