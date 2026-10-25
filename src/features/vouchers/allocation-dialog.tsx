"use client";

import { CircleAlert, ListTree, Loader2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describeFailure } from "@/lib/api-types";
import { browserApi } from "@/lib/browser-api";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  allocatedOf,
  parseMoney,
  type DraftAllocation,
  type DraftLine,
} from "./form/draft";
import type { LineAllocation } from "./types";

/** GET /parties/:id/open-bills item. */
export interface OpenBill {
  type: LineAllocation["targetType"];
  id: string;
  number: string;
  billNo: string;
  date: string;
  dueDate: string;
  total: number;
  paid: number;
  balance: number;
  overdue: boolean;
}

/** Line account types that belong to a customer or supplier. */
export const PARTY_ACCOUNT_TYPES = ["party", "supplier"];

/** A line can be allocated when it's a party account, or its type is unknown (a loaded voucher). */
export function canAllocateLine(line: DraftLine): boolean {
  return (
    line.accountType === undefined ||
    PARTY_ACCOUNT_TYPES.includes(line.accountType)
  );
}

/**
 * The party behind a ledger account: GET /parties/lookup by name, matched on
 * ledgerAccountId (names can repeat). null when it's not a party account.
 */
export async function findPartyByAccount(
  accountId: string,
  name: string | null,
): Promise<{ id: string; name: string } | null | string> {
  const params = new URLSearchParams({ limit: "100" });
  if (name) params.set("q", name.slice(0, 100));
  const result = await browserApi<
    { id: string; name: string; ledgerAccountId: string }[]
  >(`/parties/lookup?${params}`);
  if (!result.ok) return describeFailure(result);
  return (
    result.data.find((party) => party.ledgerAccountId === accountId) ?? null
  );
}

interface Row {
  bill: Omit<OpenBill, "overdue"> & { overdue: boolean };
  /** balance + what this line already had on it. */
  max: number;
  pay: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** "Allocate to bills" for one payment line. */
export function AllocationDialog({
  line,
  open,
  onOpenChange,
  onApply,
}: {
  line: DraftLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (allocations: DraftAllocation[]) => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amount = parseMoney(line.amount);
  const vat = parseMoney(line.vat, true);
  // A blank amount fills from the allocations, so there's no cap yet.
  const net =
    Number.isNaN(amount) || Number.isNaN(vat) ? null : round2(amount + vat);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const party = await findPartyByAccount(line.accountId, line.accountName);
      if (cancelled) return;
      if (typeof party === "string" || party === null) {
        setError(
          party ??
            "Only supplier and customer lines can be allocated to bills.",
        );
        return;
      }
      const result = await browserApi<OpenBill[]>(
        `/parties/${encodeURIComponent(party.id)}/open-bills`,
      );
      if (cancelled) return;
      if (!result.ok) {
        setError(describeFailure(result));
        return;
      }
      const current = line.allocations ?? [];
      const saved = (id: string) =>
        current.find((a) => a.targetId === id)?.saved ?? 0;
      const chosen = (id: string) =>
        current.find((a) => a.targetId === id)?.amount;
      const merged: Row[] = result.data.map((bill) => ({
        bill,
        max: round2(bill.balance + saved(bill.id)),
        pay: chosen(bill.id) !== undefined ? String(chosen(bill.id)) : "",
      }));
      // Bills this line already settled in full aren't "open" any more.
      for (const allocation of current) {
        if (merged.some((row) => row.bill.id === allocation.targetId)) continue;
        merged.push({
          bill: {
            type: allocation.targetType,
            id: allocation.targetId,
            number: allocation.number,
            billNo: allocation.billNo ?? "",
            date: "",
            dueDate: "",
            total: allocation.saved,
            paid: allocation.saved,
            balance: 0,
            overdue: false,
          },
          max: allocation.saved,
          pay: String(allocation.amount),
        });
      }
      setRows(merged);
    })();
    return () => {
      cancelled = true;
    };
    // Loads once per opening; the line can't change while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const payOf = (row: Row) => {
    const value = parseMoney(row.pay, true);
    return Number.isNaN(value) ? 0 : value;
  };
  const rowError = (row: Row) => {
    const value = parseMoney(row.pay, true);
    if (Number.isNaN(value)) return "0 or more, up to 2 decimals";
    if (value > row.max + 0.001) return `At most ${formatAmount(row.max)}`;
    return null;
  };
  const allocated = round2(
    (rows ?? []).reduce((sum, row) => sum + payOf(row), 0),
  );
  const remaining = net === null ? null : round2(net - allocated);
  const overAllocated = remaining !== null && remaining < -0.001;
  const invalid = (rows ?? []).some((row) => rowError(row) !== null);

  /** Oldest due first, up to the line's net (or every balance when it's blank). */
  function auto() {
    if (!rows) return;
    let left = net ?? Number.POSITIVE_INFINITY;
    const order = [...rows].sort((a, b) =>
      (a.bill.dueDate || "").localeCompare(b.bill.dueDate || ""),
    );
    const pays = new Map<string, string>();
    for (const row of order) {
      const pay = round2(Math.max(0, Math.min(row.max, left)));
      left = round2(left - pay);
      pays.set(row.bill.id, pay > 0 ? pay.toFixed(2) : "");
    }
    setRows(rows.map((row) => ({ ...row, pay: pays.get(row.bill.id) ?? "" })));
  }

  function apply() {
    if (!rows || invalid || overAllocated) return;
    const current = line.allocations ?? [];
    onApply(
      rows
        .filter((row) => payOf(row) > 0)
        .map((row) => ({
          targetType: row.bill.type,
          targetId: row.bill.id,
          number: row.bill.number,
          billNo: row.bill.billNo,
          amount: payOf(row),
          saved: current.find((a) => a.targetId === row.bill.id)?.saved ?? 0,
        })),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Allocate to bills</DialogTitle>
          <DialogDescription>
            {line.accountName ?? "This line"}: choose what this payment settles.
            Anything not allocated stays on account.
          </DialogDescription>
        </DialogHeader>

        {error ? <FormErrorSummary messages={[error]} /> : null}
        {!error && rows === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : null}
        {rows && rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No open bills. The whole amount stays on account.
          </p>
        ) : null}
        {rows && rows.length > 0 ? (
          <div className="max-h-[50vh] overflow-auto rounded-lg border">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-32 text-right">Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const message = rowError(row);
                  return (
                    <TableRow
                      key={row.bill.id}
                      className={cn(message && "bg-destructive/5")}
                    >
                      <TableCell className="font-mono text-sm">
                        {row.bill.number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.bill.billNo || "—"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.bill.date
                          ? formatCalendarDate(row.bill.date)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.bill.dueDate
                          ? formatCalendarDate(row.bill.dueDate)
                          : "—"}
                        {row.bill.overdue ? (
                          <Badge
                            variant="outline"
                            className="border-destructive/30 text-destructive ml-1.5"
                          >
                            Overdue
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatAmount(row.bill.total)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatAmount(row.bill.paid)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatAmount(row.max)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          inputMode="decimal"
                          value={row.pay}
                          onChange={(event) =>
                            setRows(
                              rows.map((r, i) =>
                                i === index
                                  ? { ...r, pay: event.target.value }
                                  : r,
                              ),
                            )
                          }
                          placeholder="0.00"
                          aria-label={`Pay towards ${row.bill.number}`}
                          aria-invalid={message ? true : undefined}
                          title={message ?? undefined}
                          className="ml-auto w-28 text-right font-mono tabular-nums"
                        />
                        {message ? (
                          <p className="text-destructive mt-1 text-xs">
                            {message}
                          </p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {rows ? (
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="tabular-nums">
              <span className="text-muted-foreground">Allocated </span>
              <span className="font-mono font-semibold">
                {formatAmount(allocated)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                / Remaining on account{" "}
              </span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  overAllocated && "text-destructive",
                )}
              >
                {remaining === null
                  ? "—"
                  : formatAmount(Math.max(remaining, 0))}
              </span>
            </p>
            {overAllocated ? (
              <p className="text-destructive flex items-center gap-1.5">
                <CircleAlert className="size-4" />
                More than the line&apos;s {formatAmount(net)}.
              </p>
            ) : net === null ? (
              <p className="text-muted-foreground">
                The line amount will be set to what you allocate.
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={auto}
            disabled={!rows || rows.length === 0}
            className="sm:mr-auto"
          >
            <Wand2 /> Auto (oldest first)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={apply}
            disabled={!rows || invalid || overAllocated}
          >
            <ListTree /> Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The grid cell: what's allocated and what stays on account, plus the button. */
export function AllocationCell({
  line,
  onOpen,
}: {
  line: DraftLine;
  onOpen: () => void;
}) {
  if (!canAllocateLine(line)) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const allocations = line.allocations ?? [];
  const net = parseMoney(line.amount, true) + parseMoney(line.vat, true) || 0;
  const onAccount = round2(net - allocatedOf(line));
  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" onClick={onOpen}>
        <ListTree />
        {allocations.length > 0
          ? `${allocations.length} bill${allocations.length === 1 ? "" : "s"}`
          : "Allocate to bills"}
      </Button>
      {allocations.length > 0 ? (
        <p className="text-muted-foreground text-xs tabular-nums">
          {allocations.map((a) => a.number).join(", ")} ·{" "}
          {onAccount > 0
            ? `${formatAmount(onAccount)} on account`
            : "fully allocated"}
        </p>
      ) : null}
    </div>
  );
}
