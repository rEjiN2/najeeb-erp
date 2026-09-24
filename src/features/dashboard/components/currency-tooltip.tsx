import type { ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";

/**
 * A ChartTooltipContent `formatter` that prefixes values with "AED" and
 * keeps the series color swatch the default renderer would otherwise draw.
 */
export function currencyTooltipFormatter(config: ChartConfig) {
  return function CurrencyTooltipRow(
    value: unknown,
    name: unknown,
    item: { color?: string; payload?: { fill?: string } },
  ) {
    const key = String(name);
    const label = config[key]?.label ?? key;
    const color = item.payload?.fill ?? item.color;

    return (
      <div className="flex w-full flex-1 items-center gap-2">
        {color ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: color }}
          />
        ) : null}
        <span className="text-muted-foreground flex-1">{label}</span>
        <span className="text-foreground font-mono font-medium tabular-nums">
          {formatCurrency(Number(value))}
        </span>
      </div>
    );
  };
}
