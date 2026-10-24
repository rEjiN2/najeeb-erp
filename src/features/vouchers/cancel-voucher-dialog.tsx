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

import type { VoucherConfig } from "./config";
import { CANCEL_REASON_MIN_LENGTH, REASON_MAX_LENGTH } from "./constants";
import type { CancelVoucherAction } from "./types";

export interface CancelTarget {
  id: string;
  voucherNo: string;
  grandTotal: number;
}

interface CancelVoucherDialogProps {
  config: VoucherConfig;
  cancelAction: CancelVoucherAction;
  /** null closes the dialog. */
  target: CancelTarget | null;
  onClose: () => void;
  onCancelled?: () => void;
}

export function CancelVoucherDialog({
  config,
  cancelAction,
  target,
  onClose,
  onCancelled,
}: CancelVoucherDialogProps) {
  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        {target ? (
          // Keyed so a fresh reason box opens for every voucher.
          <CancelForm
            key={target.id}
            config={config}
            cancelAction={cancelAction}
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
  config,
  cancelAction,
  target,
  onClose,
  onCancelled,
}: {
  config: VoucherConfig;
  cancelAction: CancelVoucherAction;
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
        const result = await cancelAction(target.id, reason);
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
        <AlertDialogTitle>
          Cancel {config.noun} {target.voucherNo}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          {config.copy.cancelEffect ??
            `The ${formatAmount(target.grandTotal)} posting is reversed on both accounts.`}{" "}
          The voucher is kept, marked cancelled, and can&apos;t be edited
          afterwards.
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
          placeholder={config.copy.cancelReasonPlaceholder}
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
        <AlertDialogCancel disabled={pending}>
          Keep {config.noun}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={confirm}
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Cancelling…" : `Cancel ${config.noun}`}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
