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
import { DemoDataBadge } from "@/features/dashboard/components/demo-data-badge";
import { currencyTooltipFormatter } from "@/features/dashboard/components/currency-tooltip";
import { PeriodToggle } from "@/features/dashboard/components/period-toggle";
import { formatCompactCurrency } from "@/lib/format";
import {
  PURCHASE_DATA,
  type PurchasePeriod,
} from "@/features/dashboard/mock-data";

const PERIOD_OPTIONS = [
  { value: "day" as const, label: "Day" },
  { value: "month" as const, label: "Month" },
  { value: "year" as const, label: "Year" },
];

const chartConfig = {
  value: { label: "Purchases", color: "var(--chart-out)" },
} satisfies ChartConfig;

export function PurchaseAnalysisCard() {
  const [period, setPeriod] = useState<PurchasePeriod>("day");
  const data = useMemo(() => PURCHASE_DATA[period], [period]);
  const average = useMemo(
    () => data.reduce((sum, point) => sum + point.value, 0) / data.length,
    [data],
  );

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Purchase Analysis
            <DemoDataBadge />
          </CardTitle>
          <CardDescription>Total purchases by {period}</CardDescription>
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
      </CardContent>
    </Card>
  );
}
