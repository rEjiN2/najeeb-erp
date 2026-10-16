"use client";

import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";

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
import { formatAmount } from "@/lib/format";

import type { VoucherWarning } from "../types";

interface VoucherWarningsDialogProps {
  /** null closes the dialog. */
  warnings: VoucherWarning[] | null;
  noun: string;
  pending: boolean;
  /** Resend the same voucher with acknowledgeWarnings: true. */
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The backend refused to save until these are confirmed (e.g. a payment
 * taking a cash account below zero). Nothing was saved yet; confirming sends
 * the same voucher again, acknowledged.
 */
export function VoucherWarningsDialog({
  warnings,
  noun,
  pending,
  onConfirm,
  onCancel,
}: VoucherWarningsDialogProps) {
  return (
    <AlertDialog
      open={warnings !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="text-primary size-5 shrink-0" />
            Save this {noun} anyway?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Nothing has been saved yet. Check what this {noun} will do before
            you confirm it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-2">
          {(warnings ?? []).map((warning) => (
            <li
              key={`${warning.code}-${warning.accountId}`}
              className="bg-muted/50 rounded-lg border p-3 text-sm"
            >
              <p className="font-medium">
                {warning.accountName}{" "}
                <span className="text-muted-foreground font-mono text-xs font-normal">
                  {warning.accountCode}
                </span>
              </p>
              {warning.code === "NEGATIVE_BALANCE" ? (
                <>
                  <p className="text-muted-foreground mt-0.5">
                    Goes below zero
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono tabular-nums">
                    <span className="text-muted-foreground">
                      {formatAmount(warning.balanceBefore)}
                    </span>
                    <ArrowRight className="text-muted-foreground size-3.5" />
                    <span className="text-destructive font-semibold">
                      {formatAmount(warning.balanceAfter)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground mt-0.5">
                  {warning.message}
                </p>
              )}
            </li>
          ))}
        </ul>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Go back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Saving…" : "Save anyway"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
