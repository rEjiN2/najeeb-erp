"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { currencyTooltipFormatter } from "@/features/dashboard/components/currency-tooltip";
import { PeriodToggle } from "@/features/dashboard/components/period-toggle";
import {
  shiftDay,
  useInvoiceTotals,
} from "@/features/dashboard/invoice-totals";
import { uaeToday } from "@/lib/datetime";
import { formatAmount, formatCompactCurrency } from "@/lib/format";

type PurchasePeriod = "day" | "month" | "year";

const PERIOD_OPTIONS = [
  { value: "day" as const, label: "Day" },
  { value: "month" as const, label: "Month" },
  { value: "year" as const, label: "Year" },
];

const chartConfig = {
  value: { label: "Purchases", color: "var(--chart-out)" },
} satisfies ChartConfig;

const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

/** Last 30 days, the last 12 months, or the last 5 years. */
function rangeOf(period: PurchasePeriod, today: string) {
  if (period === "day") return { from: shiftDay(today, -29), to: today };
  const year = Number(today.slice(0, 4));
  if (period === "year") return { from: `${year - 4}-01-01`, to: today };
  const month = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  month.setUTCMonth(month.getUTCMonth() - 11);
  return { from: month.toISOString().slice(0, 10), to: today };
}

/** Net purchases of posted invoices (GET /dashboard/purchases). */
export function PurchaseAnalysisCard() {
  const [period, setPeriod] = useState<PurchasePeriod>("day");
  const [today] = useState(() => uaeToday());
  const range = rangeOf(period, today);
  const state = useInvoiceTotals("purchases", range.from, range.to);

  const data = useMemo(() => {
    if (state.status !== "ready") return [];
    const keyOf = (date: string) =>
      period === "day"
        ? date
        : period === "month"
          ? date.slice(0, 7)
          : date.slice(0, 4);
    const totals = new Map<string, number>();
    for (const day of state.data.days) {
      const key = keyOf(day.date);
      totals.set(key, (totals.get(key) ?? 0) + day.netTotal);
    }
    return [...totals].map(([key, value]) => ({
      period:
        period === "day"
          ? dayLabel.format(new Date(`${key}T00:00:00Z`))
          : period === "month"
            ? monthLabel.format(new Date(`${key}-01T00:00:00Z`))
            : key,
      value: Math.round(value * 100) / 100,
    }));
  }, [state, period]);
  const average =
    data.length > 0
      ? data.reduce((sum, point) => sum + point.value, 0) / data.length
      : 0;

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Purchase Analysis</CardTitle>
          <CardDescription>
            {state.status === "ready"
              ? `AED ${formatAmount(state.data.netTotal)} across ${state.data.count} invoice${state.data.count === 1 ? "" : "s"}, by ${period}`
              : `Total purchases by ${period}`}
          </CardDescription>
        </div>
        <PeriodToggle
          value={period}
          onChange={setPeriod}
          options={PERIOD_OPTIONS}
        />
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <div className="bg-muted h-64 w-full animate-pulse rounded-md" />
        ) : state.status === "error" ? (
          <p className="text-muted-foreground flex h-64 items-center justify-center text-center text-sm">
            {state.message}
          </p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">
            No purchases in this period.
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <BarChart
              data={data}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value: number) => formatCompactCurrency(value)}
              />
              <ReferenceLine
                y={average}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{
                  value: "Avg",
                  position: "insideTopLeft",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={currencyTooltipFormatter(chartConfig)}
                  />
                }
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
