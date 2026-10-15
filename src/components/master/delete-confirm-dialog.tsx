import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

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

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  /** Why the last attempt failed — the dialog stays open to show it. */
  errors?: string[];
  /** Offered beside Cancel — e.g. "Deactivate instead" after a blocked delete. */
  extraAction?: ReactNode;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemLabel,
  onConfirm,
  pending = false,
  errors = [],
  extraAction,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone. {itemLabel} will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormErrorSummary messages={errors} title="Couldn't delete" />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {extraAction}
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
