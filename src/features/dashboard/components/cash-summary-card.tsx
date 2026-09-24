import { ArrowDownRight, ArrowUpRight, Banknote, Landmark } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { CASH_SUMMARY } from "@/features/dashboard/mock-data";
import { cn } from "@/lib/utils";

export function CashSummaryCard() {
  const { bank, hand, previousTotal } = CASH_SUMMARY;
  const total = bank + hand;
  const delta = ((total - previousTotal) / previousTotal) * 100;
  const isUp = delta >= 0;
  const bankShare = (bank / total) * 100;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Cash Position</CardTitle>
        <CardDescription>Bank and hand, combined</CardDescription>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-between gap-6">
        <div>
          <span className="font-mono text-3xl font-semibold tabular-nums">
            {formatCurrency(total)}
          </span>
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-sm font-medium",
              isUp ? "text-success" : "text-destructive",
            )}
          >
            {isUp ? (
              <ArrowUpRight className="size-4" />
            ) : (
              <ArrowDownRight className="size-4" />
            )}
            {formatPercent(delta)}
            <span className="text-muted-foreground font-normal">
              vs last month
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-muted flex h-2 overflow-hidden rounded-full">
            <div
              className="bg-chart-in h-full"
              style={{ width: `${bankShare}%` }}
            />
            <div
              className="bg-muted-foreground/40 h-full"
              style={{ width: `${100 - bankShare}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Landmark className="text-chart-in mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground">Cash in Bank</p>
                <p className="truncate font-mono font-medium tabular-nums">
                  {formatCurrency(bank)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Banknote className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground">Cash in Hand</p>
                <p className="truncate font-mono font-medium tabular-nums">
                  {formatCurrency(hand)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
