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

import type { SalesmanCollectionDetails, SalesmanCollectionRow } from "./types";

type State =
  | { status: "loading" }
  | { status: "done"; data: SalesmanCollectionDetails }
  | { status: "failed"; message: string };

/** What was fetched, and for which user and range. */
type Loaded = { key: string } & State;

/** One user's receipts and handovers in the report's range. */
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
  const userId = row?.staff.id ?? null;
  const key = `${userId}?${dateQuery}`;
  // Anything fetched for another row or range counts as still loading.
  const state: State = loaded?.key === key ? loaded : { status: "loading" };

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const setState = (next: State) => setLoaded({ key, ...next });
    browserApi<SalesmanCollectionDetails>(
      `/reports/salesman-collections/${encodeURIComponent(userId)}${dateQuery ? `?${dateQuery}` : ""}`,
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
  }, [userId, dateQuery, key]);

  const receipts = state.status === "done" ? (state.data.receipts ?? []) : [];
  const handovers = state.status === "done" ? (state.data.handovers ?? []) : [];

  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{row ? row.staff.name : "Details"}</SheetTitle>
          <SheetDescription>{rangeLabel}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 pt-0">
          {row ? (
            <dl className="bg-muted/40 grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
              {(
                [
                  ["Cash", row.collectedCash],
                  ["Cheque", row.collectedCheque],
                  ["Bank", row.collectedBank],
                  ["Total", row.total],
                  ["Handed over", row.handedOver],
                  ["Pending approval", row.pendingApproval],
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
                  With salesman (now)
                </dt>
                <dd className="font-mono text-base font-semibold tabular-nums">
                  {formatAmount(row.withSalesman)}
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
              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  Receipts{" "}
                  <span className="text-muted-foreground font-normal">
                    ({receipts.length})
                  </span>
                </h3>
                {receipts.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                    No receipts in this range.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {receipts.map((receipt) => (
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
                              {receipt.account?.name ?? "Unknown account"}
                            </span>
                            <PaymentMethodBadge
                              method={receipt.paymentMethod}
                            />
                            {receipt.paymentReference ? (
                              <span className="font-mono">
                                {receipt.paymentReference}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
                          {formatAmount(receipt.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  Handovers{" "}
                  <span className="text-muted-foreground font-normal">
                    ({handovers.length})
                  </span>
                </h3>
                {handovers.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                    Nothing handed over in this range.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {handovers.map((handover) => (
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
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
                          {formatAmount(
                            handover.receivedTotal ?? handover.submittedTotal,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
