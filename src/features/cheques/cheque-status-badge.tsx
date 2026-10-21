import { Badge } from "@/components/ui/badge";
import type { ChequeStatus } from "@/features/vouchers/types";
import { cn } from "@/lib/utils";

export const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  with_salesman: "With salesman",
  submitted: "Handed over",
  at_office: "In hand",
  deposited: "Deposited",
  cleared: "Cleared",
  returned: "Returned",
};

/** Pending cheques are amber, cleared green, returned red. */
export function ChequeStatusBadge({ status }: { status: ChequeStatus }) {
  const tone =
    status === "cleared"
      ? "success"
      : status === "returned"
        ? "destructive"
        : "primary";

  return (
    <Badge
      variant="outline"
      className={cn(
        tone === "success" && "border-success/30 text-success",
        tone === "primary" && "border-primary/40 text-primary",
        tone === "destructive" && "border-destructive/30 text-destructive",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "primary" && "bg-primary",
          tone === "destructive" && "bg-destructive",
        )}
      />
      {CHEQUE_STATUS_LABELS[status]}
    </Badge>
  );
}
