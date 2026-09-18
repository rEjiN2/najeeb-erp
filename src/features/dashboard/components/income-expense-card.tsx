"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { currencyTooltipFormatter } from "@/features/dashboard/components/currency-tooltip";
import { PeriodToggle } from "@/features/dashboard/components/period-toggle";
import { formatCompactCurrency } from "@/features/dashboard/format";
import { FINANCE_DATA, type Period } from "@/features/dashboard/mock-data";

const PERIOD_OPTIONS = [
  { value: "week" as const, label: "Week" },
  { value: "month" as const, label: "Month" },
  { value: "year" as const, label: "Year" },
];

const chartConfig = {
  income: { label: "Income", color: "var(--chart-in)" },
  expense: { label: "Expense", color: "var(--chart-out)" },
  profit: { label: "Profit", color: "var(--foreground)" },
} satisfies ChartConfig;

export function IncomeExpenseCard() {
  const [period, setPeriod] = useState<Period>("month");
  const data = useMemo(() => FINANCE_DATA[period], [period]);

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Income, Expense &amp; Profit</CardTitle>
          <CardDescription>Trend across the selected period</CardDescription>
        </div>
        <PeriodToggle
          value={period}
          onChange={setPeriod}
          options={PERIOD_OPTIONS}
        />
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-72 w-full"
        >
          <ComposedChart
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
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="expense"
              fill="var(--color-expense)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Line
              dataKey="profit"
              stroke="var(--color-profit)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-profit)" }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
