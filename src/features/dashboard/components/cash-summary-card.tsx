import type { ReactNode } from "react";
import { Banknote, CircleAlert, Landmark, LockKeyhole } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  findBalanceGroup,
  getDashboardSummary,
} from "@/features/dashboard/api";
import type { ApiFailureReason } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

// Business runs on UAE time; pin it so the label doesn't follow the server's
// locale/timezone.
const asOfFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Dubai",
});

function CashSummaryShell({ children }: { children: ReactNode }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Cash Position</CardTitle>
        <CardDescription>Bank and hand, combined</CardDescription>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-between gap-6">
        {children}
      </CardContent>
    </Card>
  );
}

export async function CashSummaryCard() {
  const result = await getDashboardSummary();

  if (!result.ok) {
    return <CashSummaryError reason={result.reason} status={result.status} />;
  }

  const summary = result.data;
  const bank = findBalanceGroup(summary, "bank");
  const hand = findBalanceGroup(summary, "cash");
  const total = summary.cashAndBankTotal;

  // Share bar only makes sense when both sides are non-negative and there is
  // something to split; an overdrawn bank would otherwise give a nonsense width.
  const showShare = bank.total >= 0 && hand.total >= 0 && total > 0;
  const bankShare = showShare ? (bank.total / total) * 100 : 0;

  return (
    <CashSummaryShell>
      <div>
        <span className="font-mono text-3xl font-semibold tabular-nums">
          {formatCurrency(total)}
        </span>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
          <span className="bg-success size-1.5 rounded-full" aria-hidden />
          Live · as of{" "}
          <time dateTime={summary.asOf}>
            {asOfFormatter.format(new Date(summary.asOf))}
          </time>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-muted flex h-2 overflow-hidden rounded-full">
          {showShare && (
            <>
              <div
                className="bg-chart-in h-full"
                style={{ width: `${bankShare}%` }}
              />
              <div
                className="bg-muted-foreground/40 h-full"
                style={{ width: `${100 - bankShare}%` }}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <BalanceFigure
            icon={<Landmark className="text-chart-in mt-0.5 size-4 shrink-0" />}
            label="Cash in Bank"
            amount={bank.total}
            accountCount={bank.accountCount}
          />
          <BalanceFigure
            icon={
              <Banknote className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            }
            label="Cash in Hand"
            amount={hand.total}
            accountCount={hand.accountCount}
          />
        </div>
      </div>
    </CashSummaryShell>
  );
}

function BalanceFigure({
  icon,
  label,
  amount,
  accountCount,
}: {
  icon: ReactNode;
  label: string;
  amount: number;
  accountCount: number;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div className="min-w-0">
        <p className="text-muted-foreground">{label}</p>
        <p className="truncate font-mono font-medium tabular-nums">
          {formatCurrency(amount)}
        </p>
        <p className="text-muted-foreground text-xs">
          {accountCount === 0
            ? "No accounts"
            : `${accountCount} account${accountCount === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
}

const ERROR_COPY: Record<
  ApiFailureReason,
  { title: string; body: string; icon: typeof CircleAlert }
> = {
  unauthorized: {
    title: "Not signed in to the server",
    body: "Live balances need a backend session. Sign in again to load them.",
    icon: LockKeyhole,
  },
  unavailable: {
    title: "Server unreachable",
    body: "Couldn't connect to the accounting server. Balances will show once it's back.",
    icon: CircleAlert,
  },
  error: {
    title: "Couldn't load balances",
    body: "The server returned an error. Try refreshing in a moment.",
    icon: CircleAlert,
  },
};

function CashSummaryError({
  reason,
  status,
}: {
  reason: ApiFailureReason;
  status?: number;
}) {
  const { title, body, icon: Icon } = ERROR_COPY[reason];

  return (
    <CashSummaryShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" />
        </div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground max-w-60 text-xs">
          {body}
          {reason === "error" && status ? ` (HTTP ${status})` : null}
        </p>
      </div>
    </CashSummaryShell>
  );
}

export function CashSummaryCardSkeleton() {
  return (
    <CashSummaryShell>
      <div
        aria-busy="true"
        aria-label="Loading cash position"
        className="contents"
      >
        <div className="space-y-2">
          <div className="bg-muted h-9 w-44 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          <div className="bg-muted h-2 animate-pulse rounded-full" />
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </CashSummaryShell>
  );
}
