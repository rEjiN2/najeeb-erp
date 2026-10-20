"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VoucherStatusBadge } from "@/components/voucher/voucher-status-badge";
import { cashHandoverPath } from "@/features/cash-handovers/constants";
import { cashReceiptPath } from "@/features/cash-receipts/constants";
import { PaymentMethodBadge } from "@/features/vouchers/payment-method-badge";
import { describeFailure } from "@/lib/api-types";
import { browserApi } from "@/lib/browser-api";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { SalesmanCollectionDetails, SalesmanCollectionRow } from "./types";

const SETTLEMENT_LABELS = {
  unsettled: "Not handed over",
  submitted: "On a handover, pending approval",
  settled: "Settled",
} as const;

type State =
  | { status: "loading" }
  | { status: "done"; data: SalesmanCollectionDetails }
  | { status: "failed"; message: string };

/** What was fetched, and for which cashier and range. */
type Loaded = { key: string } & State;

function Amount({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 font-mono text-sm tabular-nums",
        muted ? "text-muted-foreground" : "font-medium",
      )}
    >
      {formatAmount(value)}
    </span>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">
        {title}{" "}
        <span className="text-muted-foreground font-normal">({count})</span>
      </h3>
      {count === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          {empty}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">{children}</ul>
      )}
    </section>
  );
}

/** One cashier's receipts and handovers in the report's range. */
export function SalesmanDetailsSheet({
  row,
  dateQuery,
  rangeLabel,
  onClose,
}: {
  row: SalesmanCollectionRow | null;
  /** dateFrom/dateTo, as the report was run. */
  dateQuery: string;
  rangeLabel: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const cashierId = row?.cashier.id ?? null;
  const key = `${cashierId}?${dateQuery}`;
  // Anything fetched for another row or range counts as still loading.
  const state: State = loaded?.key === key ? loaded : { status: "loading" };

  useEffect(() => {
    if (!cashierId) return;
    const controller = new AbortController();
    const setState = (next: State) => setLoaded({ key, ...next });
    browserApi<SalesmanCollectionDetails>(
      `/reports/salesman-collections/${encodeURIComponent(cashierId)}${dateQuery ? `?${dateQuery}` : ""}`,
      { signal: controller.signal },
    )
      .then((result) =>
        setState(
          result.ok
            ? { status: "done", data: result.data }
            : { status: "failed", message: describeFailure(result) },
        ),
      )
      .catch(() => {
        // Aborted: another row was opened.
      });
    return () => controller.abort();
  }, [cashierId, dateQuery, key]);

  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {row ? `${row.cashier.name} · ${row.cashier.code}` : "Details"}
          </SheetTitle>
          <SheetDescription>{rangeLabel}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 pt-0">
          {row ? (
            <dl className="bg-muted/40 grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
              {(
                [
                  ["Opening unsettled", row.unsettledOpening],
                  ["Collected cash", row.collectedCash],
                  ["Collected bank", row.collectedBank],
                  ["Pending approval", row.pendingApproval],
                  ["Settled", row.settled],
                  ["Shortage", row.openShortage],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="font-mono tabular-nums">
                    {formatAmount(value)}
                  </dd>
                </div>
              ))}
              <div className="col-span-2 border-t pt-2">
                <dt className="text-muted-foreground text-xs">
                  Closing unsettled
                </dt>
                <dd className="font-mono text-base font-semibold tabular-nums">
                  {formatAmount(row.unsettledClosing)}
                </dd>
              </div>
            </dl>
          ) : null}

          {state.status === "loading" ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading receipts and
              handovers…
            </p>
          ) : state.status === "failed" ? (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          ) : (
            <>
              <Section
                title="Receipts"
                count={state.data.receipts.length}
                empty="No receipts in this range."
              >
                {state.data.receipts.map((receipt) => (
                  <li
                    key={receipt.id}
                    className="flex items-start justify-between gap-3 p-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <Link
                        href={cashReceiptPath(receipt.id)}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {receipt.voucherNo}
                      </Link>
                      <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                        {formatCalendarDate(receipt.date)} ·{" "}
                        <span className="truncate">
                          {receipt.account.name ?? "Unknown account"}
                        </span>
                        <PaymentMethodBadge method={receipt.paymentMethod} />
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {receipt.paymentMethod === "bank"
                          ? "Bank — verified on handover"
                          : receipt.settlementStatus
                            ? SETTLEMENT_LABELS[receipt.settlementStatus]
                            : null}
                        {receipt.handover?.voucherNo
                          ? ` · ${receipt.handover.voucherNo}`
                          : ""}
                      </p>
                    </div>
                    <Amount
                      value={receipt.amount}
                      muted={
                        receipt.paymentMethod === "bank" ||
                        receipt.settlementStatus === "settled"
                      }
                    />
                  </li>
                ))}
              </Section>

              <Section
                title="Handovers"
                count={state.data.handovers.length}
                empty="Nothing handed over in this range."
              >
                {state.data.handovers.map((handover) => (
                  <li
                    key={handover.id}
                    className="flex items-start justify-between gap-3 p-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <Link
                          href={cashHandoverPath(handover.id)}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {handover.voucherNo}
                        </Link>
                        <VoucherStatusBadge status={handover.status} />
                      </span>
                      <p className="text-muted-foreground text-xs">
                        {formatCalendarDate(handover.date)}
                        {handover.shortage > 0
                          ? ` · ${formatAmount(handover.shortage)} short`
                          : ""}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {handover.sourceAccount.name ?? "Unknown account"} →{" "}
                        {handover.receivedInto?.name ?? "not received yet"}
                      </p>
                    </div>
                    <Amount
                      value={handover.receivedCash ?? handover.expectedCash}
                    />
                  </li>
                ))}
              </Section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
