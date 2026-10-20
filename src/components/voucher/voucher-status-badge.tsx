import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** submitted / approved / rejected: the cash-handover workflow. */
export type VoucherStatus =
  "posted" | "cancelled" | "submitted" | "approved" | "rejected";

const LABELS: Record<VoucherStatus, string> = {
  posted: "Posted",
  cancelled: "Cancelled",
  submitted: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

/** Cancelled and rejected vouchers count for nothing and can't be acted on. */
export function isVoidStatus(status: VoucherStatus): boolean {
  return status === "cancelled" || status === "rejected";
}

export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  const tone = isVoidStatus(status)
    ? "destructive"
    : status === "submitted"
      ? "primary"
      : "success";

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
      {LABELS[status]}
    </Badge>
  );
}
