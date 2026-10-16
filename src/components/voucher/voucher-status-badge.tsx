import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type VoucherStatus = "posted" | "cancelled";

const LABELS: Record<VoucherStatus, string> = {
  posted: "Posted",
  cancelled: "Cancelled",
};

export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  const isPosted = status === "posted";

  return (
    <Badge
      variant="outline"
      className={cn(
        isPosted
          ? "border-success/30 text-success"
          : "border-destructive/30 text-destructive",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isPosted ? "bg-success" : "bg-destructive",
        )}
      />
      {LABELS[status]}
    </Badge>
  );
}
