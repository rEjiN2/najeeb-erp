"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ACCOUNT_TYPE_BADGES,
  CANCEL_REASON_MIN_LENGTH,
  PAYMENT_REFERENCE_MAX_LENGTH,
} from "@/features/vouchers/constants";
import type { AccountLookupItem } from "@/features/vouchers/types";
import { formatAmount } from "@/lib/format";

import { cancelReturnRefund, refundReturn } from "./actions";
import type { ReturnDetail } from "./api";
import { RETURN_KINDS } from "./constants";
import type { ReturnKind } from "./types";

interface ReturnRefundProps {
  kind: ReturnKind;
  returnId: string;
  detail: ReturnDetail;
  cancelled: boolean;
  today: string;
  /** Cash, wallet and bank accounts the money moves through. */
  accounts: AccountLookupItem[];
  canRefund: boolean;
  canCancelRefund: boolean;
}

/**
 * What is left of a return's credit and how it is settled: applied to
 * another bill (Allocations) or paid back in cash here. A refund posts a
 * Cash Payment to the customer (sales) or a Cash Receipt from the supplier
 * (purchase) and reduces the credit left on account.
 */
export function ReturnRefund({
  kind,
  returnId,
  detail,
  cancelled,
  today,
  accounts,
  canRefund,
  canCancelRefund,
}: ReturnRefundProps) {
  const router = useRouter();
  const [refunding, setRefunding] = useState(false);
  const [undoing, setUndoing] = useState<string | null>(null);
  const info = RETURN_KINDS[kind];
  const sales = kind === "sales";
  const active = detail.refunds.filter((refund) => !refund.cancelledAt);
  const canOffer = !cancelled && canRefund && detail.onAccount > 0;
  if (cancelled || (detail.onAccount <= 0 && detail.refunds.length === 0)) {
    return null;
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Credit on account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              AED {formatAmount(detail.onAccount)}
            </p>
            <p className="text-muted-foreground text-sm">
              {sales
                ? "Not applied to a bill. Apply it to another invoice of this customer, or pay it back in cash."
                : "Not applied to a bill. Apply it to another bill of this supplier, or take it back in cash."}
            </p>
          </div>
          {canOffer ? (
            <Button onClick={() => setRefunding(true)}>
              {sales ? "Pay back in cash" : "Receive in cash"}
            </Button>
          ) : null}
        </div>

        {detail.refunds.length > 0 ? (
          <ul className="divide-y rounded-md border text-sm">
            {detail.refunds.map((refund) => (
              <li
                key={refund.voucherId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{refund.voucherNo}</span>
                  <span className="text-muted-foreground">
                    {refund.date.slice(0, 10)}
                  </span>
                  {refund.cancelledAt ? (
                    <Badge variant="outline">Cancelled</Badge>
                  ) : (
                    <Badge variant="secondary">
                      {sales ? "Paid" : "Received"}
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">
                    AED {formatAmount(refund.amount)}
                  </span>
                  {!refund.cancelledAt && canCancelRefund ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUndoing(refund.voucherId)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {active.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            While a refund stands, this {info.config.noun} can&apos;t be
            cancelled; cancel the refund first.
          </p>
        ) : null}
      </CardContent>

      <RefundDialog
        key={`refund-${refunding}`}
        open={refunding}
        kind={kind}
        returnId={returnId}
        left={detail.onAccount}
        today={today}
        accounts={accounts}
        onClose={() => setRefunding(false)}
        onDone={() => router.refresh()}
      />
      <UndoDialog
        key={`undo-${undoing}`}
        kind={kind}
        returnId={returnId}
        voucherId={undoing}
        onClose={() => setUndoing(null)}
        onDone={() => router.refresh()}
      />
    </Card>
  );
}

function RefundDialog({
  open,
  kind,
  returnId,
  left,
  today,
  accounts,
  onClose,
  onDone,
}: {
  open: boolean;
  kind: ReturnKind;
  returnId: string;
  left: number;
  today: string;
  accounts: AccountLookupItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const sales = kind === "sales";
  const [accountId, setAccountId] = useState<string | null>(
    accounts[0]?.id ?? null,
  );
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState(String(left));
  const [reference, setReference] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [needsAcknowledge, setNeedsAcknowledge] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const value = Number(amount);
  const invalid = !accountId || !(value > 0) || value > left || !date;

  function submit() {
    if (invalid || !accountId) return;
    startTransition(async () => {
      try {
        const result = await refundReturn(kind, returnId, {
          voucherDate: date,
          accountId,
          amount: value,
          paymentReference: reference,
          acknowledgeWarnings: acknowledge,
        });
        if (!result) return; // Redirected to sign in.
        if (result.ok) {
          if (result.message) toast.success(result.message);
          onClose();
          onDone();
        } else {
          setErrors(result.messages);
          if (result.status === 409) setNeedsAcknowledge(true);
        }
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {sales ? "Pay back in cash" : "Receive in cash"}
          </DialogTitle>
          <DialogDescription>
            {sales
              ? "Posts a Cash Payment to the customer and reduces the credit on account."
              : "Posts a Cash Receipt from the supplier and reduces the credit on account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{sales ? "Paid from" : "Received into"} *</Label>
            <SearchableSelect
              value={accountId}
              onChange={setAccountId}
              options={accounts.map((account) => ({
                value: account.id,
                label: account.name,
                description: account.code,
                badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
              }))}
              placeholder="Pick an account"
              emptyText="No accounts you can use"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="refund-date">Date *</Label>
              <Input
                id="refund-date"
                type="date"
                value={date}
                max={today}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">
                Amount (AED) *{" "}
                <span className="text-muted-foreground">
                  max {formatAmount(left)}
                </span>
              </Label>
              <Input
                id="refund-amount"
                type="number"
                min={0}
                max={left}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-ref">Reference</Label>
            <Input
              id="refund-ref"
              value={reference}
              maxLength={PAYMENT_REFERENCE_MAX_LENGTH}
              placeholder="Transfer or cheque reference (optional)"
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          {needsAcknowledge ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={acknowledge}
                onCheckedChange={(checked) => setAcknowledge(checked === true)}
              />
              Pay even if the account goes below zero
            </label>
          ) : null}
          <FormErrorSummary messages={errors} title="Couldn't save" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Close
          </Button>
          <Button onClick={submit} disabled={pending || invalid}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {sales ? "Pay" : "Receive"} AED{" "}
            {formatAmount(value > 0 ? value : 0)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UndoDialog({
  kind,
  returnId,
  voucherId,
  onClose,
  onDone,
}: {
  kind: ReturnKind;
  returnId: string;
  voucherId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const tooShort = reason.trim().length < CANCEL_REASON_MIN_LENGTH;

  function submit() {
    if (!voucherId || tooShort) return;
    startTransition(async () => {
      try {
        const result = await cancelReturnRefund(
          kind,
          returnId,
          voucherId,
          reason,
        );
        if (!result) return;
        if (result.ok) {
          if (result.message) toast.success(result.message);
          onClose();
          onDone();
        } else {
          setErrors(result.messages);
        }
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  return (
    <Dialog
      open={voucherId !== null}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this refund?</DialogTitle>
          <DialogDescription>
            The cash voucher is reversed on both accounts and the amount is back
            on account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="undo-reason">Reason *</Label>
          <Textarea
            id="undo-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={pending}
          />
        </div>
        <FormErrorSummary messages={errors} title="Couldn't cancel" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Keep refund
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={pending || tooShort}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Cancel refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
