const numberFormatter = new Intl.NumberFormat("en-US");

export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}AED ${numberFormatter.format(Math.abs(Math.round(value)))}`;
}

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Exact ledger figure, to the fils — "AED 1,234.50". */
/** null, undefined or NaN show as 0.00, never "NaN". */
export function formatAmount(raw: number | null | undefined): string {
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  const sign = value < 0 ? "-" : "";
  return `${sign}AED ${amountFormatter.format(Math.abs(value))}`;
}

/** Short axis/tick form — "AED 120k", "AED 1.4M". */
export function formatCompactCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    return `${sign}AED ${millions.toFixed(millions >= 10 ? 0 : 1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}AED ${Math.round(abs / 1_000)}k`;
  }
  return formatCurrency(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
