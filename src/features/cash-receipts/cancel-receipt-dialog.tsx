"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormErrorSummary } from "@/components/master/form-error-summary";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatAmount } from "@/lib/format";

import { cancelCashReceipt } from "./actions";
import { CANCEL_REASON_MIN_LENGTH, REASON_MAX_LENGTH } from "./constants";

export interface CancelTarget {
  id: string;
  voucherNo: string;
  grandTotal: number;
}

interface CancelReceiptDialogProps {
  /** null closes the dialog. */
  target: CancelTarget | null;
  onClose: () => void;
  onCancelled?: () => void;
}

export function CancelReceiptDialog({
  target,
  onClose,
  onCancelled,
}: CancelReceiptDialogProps) {
  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        {target ? (
          // Keyed so a fresh reason box opens for every receipt.
          <CancelForm
            key={target.id}
            target={target}
            onClose={onClose}
            onCancelled={onCancelled}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CancelForm({
  target,
  onClose,
  onCancelled,
}: {
  target: CancelTarget;
  onClose: () => void;
  onCancelled?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const tooShort = reason.trim().length < CANCEL_REASON_MIN_LENGTH;
  const fieldError =
    touched && tooShort
      ? `Enter a reason of at least ${CANCEL_REASON_MIN_LENGTH} characters.`
      : null;

  function confirm() {
    setTouched(true);
    if (tooShort) return;

    startTransition(async () => {
      try {
        const result = await cancelCashReceipt(target.id, reason);
        if (!result) return; // Redirected to sign in.
        if (result.ok) {
          if (result.message) toast.success(result.message);
          onClose();
          onCancelled?.();
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
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancel receipt {target.voucherNo}?</AlertDialogTitle>
        <AlertDialogDescription>
          The {formatAmount(target.grandTotal)} posting is reversed on both
          accounts. The voucher is kept, marked cancelled, and can&apos;t be
          edited afterwards.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="space-y-2">
        <Label htmlFor="cancel-reason">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (errors.length) setErrors([]);
          }}
          onBlur={() => setTouched(true)}
          maxLength={REASON_MAX_LENGTH}
          placeholder="e.g. Duplicate of CR000123"
          disabled={pending}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "cancel-reason-error" : undefined}
          autoFocus
        />
        {fieldError ? (
          <p id="cancel-reason-error" className="text-destructive text-sm">
            {fieldError}
          </p>
        ) : null}
      </div>

      <FormErrorSummary messages={errors} title="Couldn't cancel" />

      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Keep receipt</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={confirm}
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Cancelling…" : "Cancel receipt"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
