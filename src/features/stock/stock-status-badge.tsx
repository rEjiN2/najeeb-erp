import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { StockStatus } from "./types";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  ok: "OK",
  reorder: "Reorder",
  below_min: "Below minimum",
};

/** Red below the minimum, amber at or below the reorder level. */
export function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "ok" && "border-success/30 text-success",
        status === "reorder" && "border-primary/40 text-primary",
        status === "below_min" && "border-destructive/30 text-destructive",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "ok" && "bg-success",
          status === "reorder" && "bg-primary",
          status === "below_min" && "bg-destructive",
        )}
      />
      {STOCK_STATUS_LABELS[status]}
    </Badge>
  );
}
