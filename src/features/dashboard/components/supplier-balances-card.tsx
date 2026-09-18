import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/features/dashboard/format";
import { SUPPLIER_BALANCES } from "@/features/dashboard/mock-data";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SupplierBalancesCard() {
  const sorted = [...SUPPLIER_BALANCES].sort(
    (a, b) => Math.abs(b.balance) - Math.abs(a.balance),
  );
  const max = Math.max(
    ...sorted.map((supplier) => Math.abs(supplier.balance)),
    1,
  );

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Supplier Balances</CardTitle>
        <CardDescription>
          Top outstanding amounts — signed from our side
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sorted.map((supplier) => {
            const owedToUs = supplier.balance > 0;
            return (
              <li key={supplier.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                      {initials(supplier.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{supplier.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {owedToUs ? "Owes us" : "We owe"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 font-mono tabular-nums",
                      owedToUs ? "text-success" : "text-destructive",
                    )}
                  >
                    {owedToUs ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : (
                      <ArrowDownRight className="size-3.5" />
                    )}
                    {owedToUs ? "+" : "-"}
                    {formatCurrency(Math.abs(supplier.balance))}
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      owedToUs ? "bg-success" : "bg-destructive",
                    )}
                    style={{
                      width: `${(Math.abs(supplier.balance) / max) * 100}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
