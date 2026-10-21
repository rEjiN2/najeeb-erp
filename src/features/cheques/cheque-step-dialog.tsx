"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
import { SearchableSelect } from "@/components/shared/searchable-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCOUNT_TYPE_BADGES,
  CANCEL_REASON_MIN_LENGTH,
  REASON_MAX_LENGTH,
} from "@/features/vouchers/constants";
import type { AccountLookupItem } from "@/features/vouchers/types";
import { toDateInputValue } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import type { MutationResult } from "@/lib/mutation";

import {
  clearCheque,
  depositCheque,
  returnCheque,
  undoChequeStep,
} from "./actions";
import type { ChequeRow } from "./types";

export type ChequeStep = "deposit" | "clear" | "return" | "undo";

const COPY: Record<
  ChequeStep,
  { title: string; button: string; pending: string; body: string }
> = {
  deposit: {
    title: "Deposit cheque",
    button: "Deposit",
    pending: "Depositing…",
    body: "Marks the cheque as taken to the bank. Nothing is posted until it clears.",
  },
  clear: {
    title: "Clear cheque",
    button: "Clear",
    pending: "Clearing…",
    body: "The money has arrived: it moves out of cheques in hand into the account below.",
  },
  return: {
    title: "Return cheque",
    button: "Return",
    pending: "Returning…",
    body: "The cheque bounced: the receipt is reversed, so the customer owes the amount again.",
  },
  undo: {
    title: "Undo last step",
    button: "Undo",
    pending: "Undoing…",
    body: "Reverses the cheque's last deposit, clearance or return, and anything it posted.",
  },
};

interface ChequeStepDialogProps {
  /** null closes the dialog. */
  target: { cheque: ChequeRow; step: ChequeStep } | null;
  onClose: () => void;
  /** Company bank, cash and wallet accounts; deposits pick banks only. */
  accounts: AccountLookupItem[];
  today: string;
}

export function ChequeStepDialog({
  target,
  onClose,
  accounts,
  today,
}: ChequeStepDialogProps) {
  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        {target ? (
          // Keyed so every cheque opens a fresh form.
          <StepForm
            key={`${target.cheque.id}-${target.step}`}
            cheque={target.cheque}
            step={target.step}
            accounts={accounts}
            today={today}
            onClose={onClose}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StepForm({
  cheque,
  step,
  accounts,
  today,
  onClose,
}: {
  cheque: ChequeRow;
  step: ChequeStep;
  accounts: AccountLookupItem[];
  today: string;
  onClose: () => void;
}) {
  const copy = COPY[step];
  const chequeDay = cheque.chequeDate
    ? toDateInputValue(cheque.chequeDate)
    : "";
  // Deposits and clearances can't be dated before the cheque.
  const [date, setDate] = useState(
    chequeDay && chequeDay > today ? chequeDay : today,
  );
  const [accountId, setAccountId] = useState(
    step === "clear" ? (cheque.depositedInto?.id ?? "") : "",
  );
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const options = accounts
    .filter((account) => step !== "deposit" || account.type === "bank")
    .map((account) => ({
      value: account.id,
      label: account.name,
      description: account.code,
      badge: ACCOUNT_TYPE_BADGES[account.type] ?? account.type,
    }));
  const needsDate = step !== "undo";
  const needsAccount = step === "deposit" || step === "clear";
  const needsReason = step === "return" || step === "undo";

  const fieldErrors = {
    date: needsDate && !date ? "Pick the date." : null,
    account:
      needsAccount && !accountId
        ? step === "deposit"
          ? "Pick the bank it was deposited in."
          : "Pick the account the money arrived in."
        : null,
    reason:
      needsReason && reason.trim().length < CANCEL_REASON_MIN_LENGTH
        ? `Enter a reason of at least ${CANCEL_REASON_MIN_LENGTH} characters.`
        : null,
  };
  const invalid = Object.values(fieldErrors).some(Boolean);

  function confirm() {
    setTouched(true);
    if (invalid) return;
    startTransition(async () => {
      let result: MutationResult;
      try {
        result =
          step === "deposit"
            ? await depositCheque(cheque.id, { bankAccountId: accountId, date })
            : step === "clear"
              ? await clearCheque(cheque.id, {
                  date,
                  destinationAccountId: accountId,
                })
              : step === "return"
                ? await returnCheque(cheque.id, { date, reason })
                : await undoChequeStep(cheque.id, { reason });
      } catch {
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
        return;
      }
      if (!result) return; // Redirected to sign in.
      if (result.ok) {
        if (result.message) toast.success(result.message);
        onClose();
      } else {
        setErrors(result.messages);
      }
    });
  }

  const show = (message: string | null) => (touched ? message : null);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {copy.title} {cheque.chequeNumber ?? ""}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {formatAmount(cheque.amount)} from{" "}
          {cheque.customer?.name ?? "unknown customer"} on {cheque.voucherNo}.{" "}
          {copy.body}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="space-y-4">
        {needsDate ? (
          <div className="space-y-2">
            <Label htmlFor="cheque-step-date">
              {step === "deposit"
                ? "Deposit date"
                : step === "clear"
                  ? "Cleared on"
                  : "Returned on"}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cheque-step-date"
              type="date"
              value={date}
              min={step !== "return" ? chequeDay || undefined : undefined}
              max={step === "clear" ? today : undefined}
              onChange={(event) => setDate(event.target.value)}
              disabled={pending}
            />
            {show(fieldErrors.date) ? (
              <p className="text-destructive text-sm">{fieldErrors.date}</p>
            ) : null}
          </div>
        ) : null}

        {needsAccount ? (
          <div className="space-y-2">
            <Label>
              {step === "deposit" ? "Bank" : "Credit to"}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={accountId || null}
              onChange={(value) => setAccountId(value ?? "")}
              options={options}
              placeholder={
                step === "deposit" ? "Select bank" : "Select account"
              }
              emptyText="No active accounts. Add one under Masters → Accounts."
              allowClear={false}
              disabled={pending}
            />
            {step === "clear" ? (
              <p className="text-muted-foreground text-xs">
                Bank, cash or wallet account.
              </p>
            ) : null}
            {show(fieldErrors.account) ? (
              <p className="text-destructive text-sm">{fieldErrors.account}</p>
            ) : null}
          </div>
        ) : null}

        {needsReason ? (
          <div className="space-y-2">
            <Label htmlFor="cheque-step-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cheque-step-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={REASON_MAX_LENGTH}
              placeholder={
                step === "return"
                  ? "e.g. Insufficient funds"
                  : "e.g. Cleared by mistake"
              }
              disabled={pending}
            />
            {show(fieldErrors.reason) ? (
              <p className="text-destructive text-sm">{fieldErrors.reason}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <FormErrorSummary messages={errors} title="Couldn't save" />

      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Close</AlertDialogCancel>
        <AlertDialogAction
          variant={step === "return" ? "destructive" : "default"}
          onClick={confirm}
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? copy.pending : copy.button}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
