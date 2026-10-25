"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { Input } from "@/components/ui/input";
import { currencyTooltipFormatter } from "@/features/dashboard/components/currency-tooltip";
import {
  shiftDay,
  useInvoiceTotals,
} from "@/features/dashboard/invoice-totals";
import { uaeToday } from "@/lib/datetime";
import { formatAmount, formatCompactCurrency } from "@/lib/format";

const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const chartConfig = {
  value: { label: "Sales", color: "var(--chart-in)" },
} satisfies ChartConfig;

/** Daily net sales and per salesman (GET /dashboard/sales); scoped users get their own. */
export function SalesAnalysisCard() {
  const [today] = useState(() => uaeToday());
  const [from, setFrom] = useState(() => shiftDay(today, -29));
  const [to, setTo] = useState(today);
  const state = useInvoiceTotals("sales", from, to);

  const data = useMemo(
    () =>
      state.status === "ready"
        ? state.data.days.map((day) => ({
            period: dayLabel.format(new Date(`${day.date}T00:00:00Z`)),
            value: day.netTotal,
          }))
        : [],
    [state],
  );
  const salesmen =
    state.status === "ready" ? (state.data.bySalesman ?? []).slice(0, 5) : [];

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-col gap-3">
        <div>
          <CardTitle>Sales Analysis</CardTitle>
          <CardDescription>
            {state.status === "ready"
              ? `AED ${formatAmount(state.data.netTotal)} across ${state.data.count} invoice${state.data.count === 1 ? "" : "s"}`
              : "By date range and salesman"}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(event) =>
              event.target.value && setFrom(event.target.value)
            }
            className="w-auto"
            aria-label="From date"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(event) =>
              event.target.value && setTo(event.target.value)
            }
            className="w-auto"
            aria-label="To date"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === "loading" ? (
          <div className="bg-muted h-64 w-full animate-pulse rounded-md" />
        ) : state.status === "error" ? (
          <p className="text-muted-foreground flex h-64 items-center justify-center text-center text-sm">
            {state.message}
          </p>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">
            No sales in this period.
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
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value: number) => formatCompactCurrency(value)}
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
                maxBarSize={20}
              />
            </BarChart>
          </ChartContainer>
        )}
        {salesmen.length > 0 ? (
          <ul className="divide-y rounded-md border text-sm">
            {salesmen.map((salesman) => (
              <li
                key={salesman.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <span>
                  {salesman.name}
                  <span className="text-muted-foreground">
                    {" "}
                    · {salesman.count} invoice{salesman.count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  {formatAmount(salesman.netTotal)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
