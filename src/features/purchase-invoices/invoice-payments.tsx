"use client";

import { Banknote, Link2, Loader2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cashPaymentPath } from "@/features/cash-payments/constants";
import { cashReceiptPath } from "@/features/cash-receipts/constants";
import {
  CANCEL_REASON_MIN_LENGTH,
  REASON_MAX_LENGTH,
} from "@/features/vouchers/constants";
import { describeFailure } from "@/lib/api-types";
import { browserApi } from "@/lib/browser-api";
import { formatCalendarDate, formatExactUae } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import type { MutationResult } from "@/lib/mutation";
import { cn } from "@/lib/utils";

import {
  applyPaymentToInvoice,
  reverseInvoiceAllocation,
  type InvoiceTargetType,
} from "./actions";
import type { InvoiceAllocation, UnallocatedPayment } from "./types";

const MONEY = /^\d+(\.\d{1,2})?$/;

/** Where an allocation's payment voucher lives. */
function paymentHref(allocation: {
  paymentVoucherType: string;
  paymentVoucherId: string;
}) {
  if (allocation.paymentVoucherType === "cash-receipt") {
    return cashReceiptPath(allocation.paymentVoucherId);
  }
  return allocation.paymentVoucherType === "cash-payment"
    ? cashPaymentPath(allocation.paymentVoucherId)
    : null;
}

/** The invoice's payments: Pay, Apply existing payment, and each allocation
 * with Reverse. Sales invoices get receipts instead of payments. */
export function InvoicePayments({
  invoiceId,
  supplierId,
  balance,
  posted,
  payHref,
  canAllocate,
  allocations,
  targetType = "purchase-invoice",
}: {
  invoiceId: string;
  /** The supplier, or a sales invoice's customer. */
  supplierId: string;
  balance: number;
  posted: boolean;
  /** The prefilled payment/receipt form; null without its :create permission. */
  payHref: string | null;
  /** allocations:manage */
  canAllocate: boolean;
  allocations: InvoiceAllocation[];
  targetType?: InvoiceTargetType;
}) {
  const router = useRouter();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reversing, setReversing] = useState<InvoiceAllocation | null>(null);
  const owed = posted && balance > 0;
  const sale = targetType === "sales-invoice";

  /** Shows the outcome; true when it went through. */
  function settle(result: MutationResult | undefined): boolean {
    if (!result) return false; // Redirected to sign in.
    if (!result.ok) return false;
    if (result.message) toast.success(result.message);
    router.refresh();
    return true;
  }

  return (
    <Card className="gap-4">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Payments</CardTitle>
        {owed ? (
          <div className="flex flex-wrap gap-2">
            {canAllocate ? (
              <Button variant="outline" onClick={() => setApplyOpen(true)}>
                <Link2 /> Apply existing {sale ? "receipt" : "payment"}
              </Button>
            ) : null}
            {payHref ? (
              <Link href={payHref} className={buttonVariants()}>
                <Banknote /> Pay
              </Link>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {allocations.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No payments applied yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-28">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation) => {
                  const href = paymentHref(allocation);
                  const reversed = allocation.status === "reversed";
                  return (
                    <TableRow
                      key={allocation.id}
                      className={cn(reversed && "text-muted-foreground")}
                    >
                      <TableCell>
                        {href ? (
                          <Link
                            href={href}
                            className="font-mono text-sm font-medium hover:underline"
                          >
                            {allocation.paymentVoucherNo}
                          </Link>
                        ) : (
                          <span className="font-mono text-sm">
                            {allocation.paymentVoucherNo}
                          </span>
                        )}
                        {reversed ? (
                          <span className="block text-xs">
                            <Badge variant="outline" className="mr-1">
                              Reversed
                            </Badge>
                            {allocation.reverseReason}
                            {allocation.reversedBy
                              ? ` · ${allocation.reversedBy.name}`
                              : ""}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {allocation.createdAt
                          ? formatExactUae(allocation.createdAt)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {allocation.createdBy?.name ?? "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono text-sm tabular-nums",
                          reversed && "line-through",
                        )}
                      >
                        {formatAmount(allocation.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!reversed && canAllocate ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReversing(allocation)}
                          >
                            <Undo2 /> Reverse
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {applyOpen ? (
        <ApplyPaymentDialog
          invoiceId={invoiceId}
          supplierId={supplierId}
          balance={balance}
          targetType={targetType}
          onClose={() => setApplyOpen(false)}
          onApplied={settle}
        />
      ) : null}
      {reversing ? (
        <ReverseDialog
          key={reversing.id}
          invoiceId={invoiceId}
          allocation={reversing}
          targetType={targetType}
          onClose={() => setReversing(null)}
          onReversed={settle}
        />
      ) : null}
    </Card>
  );
}

function ApplyPaymentDialog({
  invoiceId,
  supplierId,
  balance,
  targetType,
  onClose,
  onApplied,
}: {
  invoiceId: string;
  supplierId: string;
  balance: number;
  targetType: InvoiceTargetType;
  onClose: () => void;
  onApplied: (result: MutationResult | undefined) => boolean;
}) {
  const [rows, setRows] = useState<
    (UnallocatedPayment & { pay: string })[] | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void browserApi<UnallocatedPayment[]>(
      `/parties/${encodeURIComponent(supplierId)}/unallocated-payments`,
    ).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(describeFailure(result));
        return;
      }
      setRows(
        result.data.map((row) => ({
          ...row,
          pay: Math.min(row.unallocated, balance).toFixed(2),
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [supplierId, balance]);

  function apply(row: UnallocatedPayment & { pay: string }) {
    setErrors([]);
    const amount = Number(row.pay);
    if (!MONEY.test(row.pay.trim()) || !(amount > 0)) {
      setErrors(["Enter an amount greater than 0, up to 2 decimals."]);
      return;
    }
    startTransition(async () => {
      try {
        const result = await applyPaymentToInvoice(
          invoiceId,
          {
            paymentVoucherType: row.paymentVoucherType,
            paymentVoucherId: row.paymentVoucherId,
            paymentLineIndex: row.paymentLineIndex,
          },
          amount,
          targetType,
        );
        if (result && !result.ok) {
          setErrors(result.messages);
          return;
        }
        if (onApplied(result)) onClose();
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Apply existing{" "}
            {targetType === "sales-invoice" ? "receipt" : "payment"}
          </DialogTitle>
          <DialogDescription>
            {targetType === "sales-invoice"
              ? "Receipts from this customer"
              : "Payments to this supplier"}{" "}
            with money still on account. Balance owed on this invoice: AED{" "}
            {formatAmount(balance)}.
          </DialogDescription>
        </DialogHeader>
        <FormErrorSummary messages={loadError ? [loadError] : errors} />
        {!loadError && rows === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : null}
        {rows && rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {targetType === "sales-invoice"
              ? "No receipts from this customer have money on account."
              : "No payments to this supplier have money on account."}
          </p>
        ) : null}
        {rows && rows.length > 0 ? (
          <div className="max-h-[50vh] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Line</TableHead>
                  <TableHead className="text-right">On account</TableHead>
                  <TableHead className="w-32 text-right">Apply</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow
                    key={`${row.paymentVoucherId}-${row.paymentLineIndex}`}
                  >
                    <TableCell className="font-mono text-sm">
                      {row.voucherNo}
                      <span className="text-muted-foreground block text-xs">
                        Line {row.paymentLineIndex + 1}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatCalendarDate(row.voucherDate)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatAmount(row.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatAmount(row.unallocated)}
                    </TableCell>
                    <TableCell>
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
                        aria-label={`Amount to apply from ${row.voucherNo}`}
                        className="ml-auto w-28 text-right font-mono tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => apply(row)}
                        disabled={pending}
                      >
                        {pending ? <Loader2 className="animate-spin" /> : null}
                        Apply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReverseDialog({
  invoiceId,
  allocation,
  targetType,
  onClose,
  onReversed,
}: {
  invoiceId: string;
  allocation: InvoiceAllocation;
  targetType: InvoiceTargetType;
  onClose: () => void;
  onReversed: (result: MutationResult | undefined) => boolean;
}) {
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const tooShort = reason.trim().length < CANCEL_REASON_MIN_LENGTH;

  function reverse() {
    if (tooShort) {
      setErrors([
        `Give a reason of at least ${CANCEL_REASON_MIN_LENGTH} characters.`,
      ]);
      return;
    }
    startTransition(async () => {
      try {
        const result = await reverseInvoiceAllocation(
          invoiceId,
          allocation.id,
          reason,
          targetType,
        );
        if (result && !result.ok) {
          setErrors(result.messages);
          return;
        }
        if (onReversed(result)) onClose();
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Reverse {formatAmount(allocation.amount)} from{" "}
            {allocation.paymentVoucherNo}?
          </DialogTitle>
          <DialogDescription>
            The invoice owes this amount again and the payment&apos;s money goes
            back on account. The payment itself is not cancelled.
          </DialogDescription>
        </DialogHeader>
        <FormErrorSummary messages={errors} />
        <div className="space-y-2">
          <Label htmlFor="reverse-reason">Reason</Label>
          <Input
            id="reverse-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={REASON_MAX_LENGTH}
            placeholder="e.g. Applied to the wrong bill"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={reverse} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Undo2 />}
            Reverse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
