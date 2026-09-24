export interface VoucherTotal {
  label: string;
  value: string;
  emphasize?: boolean;
}

interface VoucherTotalsFooterProps {
  totals: VoucherTotal[];
}

export function VoucherTotalsFooter({ totals }: VoucherTotalsFooterProps) {
  return (
    <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-end sm:gap-8">
      {totals.map((total) => (
        <div
          key={total.label}
          className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-end sm:gap-0.5"
        >
          <span className="text-muted-foreground text-sm">{total.label}</span>
          <span
            className={
              total.emphasize
                ? "font-mono text-lg font-semibold tabular-nums"
                : "font-mono text-sm font-medium tabular-nums"
            }
          >
            {total.value}
          </span>
        </div>
      ))}
    </div>
  );
}
