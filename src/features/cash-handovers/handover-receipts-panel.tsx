"use client";

import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cashReceiptPath } from "@/features/cash-receipts/constants";
import {
  ACCOUNT_TYPE_BADGES,
  CANCEL_REASON_MIN_LENGTH,
  REASON_MAX_LENGTH,
} from "@/features/vouchers/constants";
import { PaymentMethodBadge } from "@/features/vouchers/payment-method-badge";
import type { AccountLookupItem } from "@/features/vouchers/types";
import { formatCalendarDate } from "@/lib/datetime";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

import { approveCashHandover, rejectCashHandover } from "./actions";
import type { HandoverDetail } from "./types";

const round2 = (value: number) => Math.round(value * 100) / 100;

interface HandoverReceiptsPanelProps {
  detail: HandoverDetail;
  /** Accounts the cash can be received into; null without approve rights or
   * once the handover is no longer pending. */
  receiveAccounts: AccountLookupItem[] | null;
}

/** The receipts on a handover and, while pending, the approver's controls. */
export function HandoverReceiptsPanel({
  detail,
  receiveAccounts,
}: HandoverReceiptsPanelProps) {
  const bankReceipts = detail.receipts.filter(
    (row) => row.paymentMethod === "bank",
  );

  return (
    <>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Receipts ({detail.receipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.receipts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Recorded before receipts were listed on handovers.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {detail.receipts.map((row) => (
                <li
                  key={row.receiptId}
                  className="flex items-center gap-3 p-3 text-sm"
                >
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link
                        href={cashReceiptPath(row.receiptId)}
                        className="font-mono font-medium hover:underline"
                      >
                        {row.voucherNo}
                      </Link>
                      <PaymentMethodBadge method={row.paymentMethod} />
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {formatCalendarDate(row.voucherDate)}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {detail.status === "submitted" && receiveAccounts ? (
        <ApproveCard
          detail={detail}
          bankReceipts={bankReceipts}
          accounts={receiveAccounts.filter(
            (account) => account.id !== detail.sourceAccountId,
          )}
        />
      ) : null}
    </>
  );
}

function ApproveCard({
  detail,
  bankReceipts,
  accounts,
}: {
  detail: HandoverDetail;
  bankReceipts: HandoverDetail["receipts"];
  accounts: AccountLookupItem[];
}) {
  const [receivedText, setReceivedText] = useState(
    (detail.countedCash ?? detail.expectedCash).toFixed(2),
  );
  const [accountId, setAccountId] = useState<string | null>(null);
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const received = Number(receivedText);
  const validAmount =
    receivedText.trim() !== "" && Number.isFinite(received) && received >= 0;
  const variance = validAmount ? round2(received - detail.expectedCash) : 0;
  const excess = variance > 0;
  const short = variance < 0;
  const allVerified = bankReceipts.every((row) => verified.has(row.receiptId));

  const canApprove =
    validAmount &&
    !excess &&
    accountId !== null &&
    allVerified &&
    (!short || reason.trim() !== "");

  function run(task: () => ReturnType<typeof approveCashHandover>) {
    startTransition(async () => {
      const result = await task();
      if (!result) return; // redirected to /login
      if (!result.ok) {
        setErrors(result.messages);
        return;
      }
      setErrors([]);
      if (result.message) toast.success(result.message);
    });
  }

  function approve() {
    if (!canApprove || !accountId) return;
    run(() =>
      approveCashHandover(detail.id, {
        receivedCash: round2(received),
        receivedIntoAccountId: accountId,
        varianceReason: short ? reason : "",
      }),
    );
  }

  function reject() {
    if (rejectReason.trim().length < CANCEL_REASON_MIN_LENGTH) {
      setErrors([
        `Give a reason of at least ${CANCEL_REASON_MIN_LENGTH} characters.`,
      ]);
      return;
    }
    run(() => rejectCashHandover(detail.id, rejectReason));
  }

  return (
    <Card className="gap-4 print:hidden">
      <CardHeader>
        <CardTitle>Approve Handover</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormErrorSummary messages={errors} />

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              Expected cash
            </dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">
              {formatCurrency(detail.expectedCash)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              Counted by staff
            </dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">
              {detail.countedCash === null
                ? "—"
                : formatCurrency(detail.countedCash)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              Bank receipts
            </dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">
              {formatCurrency(detail.bankTotal)}
            </dd>
          </div>
        </dl>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="received-cash">
              Cash received <span className="text-destructive">*</span>
            </Label>
            <Input
              id="received-cash"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={receivedText}
              onChange={(event) => setReceivedText(event.target.value)}
              disabled={pending}
              aria-invalid={excess || !validAmount ? true : undefined}
              className="font-mono"
            />
            {validAmount ? (
              <p
                className={cn(
                  "text-xs font-medium",
                  excess
                    ? "text-destructive"
                    : short
                      ? "text-primary"
                      : "text-success",
                )}
              >
                {excess
                  ? `${formatCurrency(variance)} excess — more than expected can't be approved`
                  : short
                    ? `${formatCurrency(-variance)} short`
                    : "Matches the expected cash"}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>
              Receive into <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={accountId}
              onChange={setAccountId}
              options={accounts.map((account) => ({
                value: account.id,
                label: account.name,
                description: account.code,
                badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
              }))}
              placeholder="Select account"
              emptyText="No other active cash, wallet or bank accounts."
              allowClear={false}
              disabled={pending}
            />
          </div>
        </div>

        {short ? (
          <div className="space-y-2">
            <Label htmlFor="variance-reason">
              Reason for the shortage{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="variance-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={REASON_MAX_LENGTH}
              disabled={pending}
            />
          </div>
        ) : null}

        {bankReceipts.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Verify bank receipts in the bank statement
            </legend>
            {bankReceipts.map((row) => (
              <label
                key={row.receiptId}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={verified.has(row.receiptId)}
                  disabled={pending}
                  onCheckedChange={(checked) =>
                    setVerified((prev) => {
                      const next = new Set(prev);
                      if (checked === true) next.add(row.receiptId);
                      else next.delete(row.receiptId);
                      return next;
                    })
                  }
                />
                <span className="font-mono">{row.voucherNo}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(row.amount)}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {rejecting ? (
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Why are you rejecting it?{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              maxLength={REASON_MAX_LENGTH}
              placeholder="The receipts go back to the staff member to hand over again."
              disabled={pending}
            />
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {rejecting ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setRejecting(false)}
                disabled={pending}
              >
                Back
              </Button>
              <Button variant="destructive" onClick={reject} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <X />}
                Reject handover
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setRejecting(true)}
                disabled={pending}
              >
                <X /> Reject
              </Button>
              <Button onClick={approve} disabled={pending || !canApprove}>
                {pending ? <Loader2 className="animate-spin" /> : <Check />}
                Approve
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
