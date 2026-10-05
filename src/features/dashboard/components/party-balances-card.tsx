import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DemoDataBadge } from "@/features/dashboard/components/demo-data-badge";
import { formatCurrency } from "@/lib/format";
import { PARTY_BALANCES } from "@/features/dashboard/mock-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PartyBalancesCard() {
  const sorted = [...PARTY_BALANCES].sort(
    (a, b) => b.outstanding - a.outstanding,
  );
  const max = sorted[0]?.outstanding ?? 1;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Party Balances
          <DemoDataBadge />
        </CardTitle>
        <CardDescription>Top outstanding customer amounts</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sorted.map((party) => (
            <li key={party.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {initials(party.name)}
                  </span>
                  <span className="truncate font-medium">{party.name}</span>
                </div>
                <span className="shrink-0 font-mono tabular-nums">
                  {formatCurrency(party.outstanding)}
                </span>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-chart-in h-full rounded-full"
                  style={{ width: `${(party.outstanding / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
