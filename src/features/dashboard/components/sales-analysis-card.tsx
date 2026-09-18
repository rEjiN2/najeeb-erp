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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencyTooltipFormatter } from "@/features/dashboard/components/currency-tooltip";
import { formatCompactCurrency } from "@/features/dashboard/format";
import { SALES_RECORDS, SALESMEN } from "@/features/dashboard/mock-data";

const LATEST_DATE = "2026-09-18";

const dayLabel = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

function isoDaysAgo(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const chartConfig = {
  value: { label: "Sales", color: "var(--chart-in)" },
} satisfies ChartConfig;

export function SalesAnalysisCard() {
  const [from, setFrom] = useState(() => isoDaysAgo(LATEST_DATE, 29));
  const [to, setTo] = useState(LATEST_DATE);
  const [salesman, setSalesman] = useState<string>("all");

  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const record of SALES_RECORDS) {
      if (record.date < from || record.date > to) continue;
      if (salesman !== "all" && record.salesman !== salesman) continue;
      totals.set(record.date, (totals.get(record.date) ?? 0) + record.amount);
    }
    return Array.from(totals.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => ({
        period: dayLabel.format(new Date(`${date}T00:00:00Z`)),
        value,
      }));
  }, [from, to, salesman]);

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-col gap-3">
        <div>
          <CardTitle>Sales Analysis</CardTitle>
          <CardDescription>By date range and salesman</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            className="w-auto"
            aria-label="From date"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={to}
            min={from}
            max={LATEST_DATE}
            onChange={(event) => setTo(event.target.value)}
            className="w-auto"
            aria-label="To date"
          />
          <Select
            value={salesman}
            onValueChange={(value) => {
              if (value) setSalesman(value);
            }}
          >
            <SelectTrigger className="ml-auto w-[180px]" aria-label="Salesman">
              <SelectValue placeholder="Salesman" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All salesmen</SelectItem>
              {SALESMEN.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </CardContent>
    </Card>
  );
}
