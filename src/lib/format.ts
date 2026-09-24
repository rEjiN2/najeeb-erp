const numberFormatter = new Intl.NumberFormat("en-US");

export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}AED ${numberFormatter.format(Math.abs(Math.round(value)))}`;
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
