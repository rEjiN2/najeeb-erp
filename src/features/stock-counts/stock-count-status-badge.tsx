import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { STOCK_COUNT_STATUS_LABELS, type StockCountStatus } from "./constants";

const TONES: Record<StockCountStatus, string> = {
  draft: "border-border text-muted-foreground",
  submitted: "border-primary/40 text-primary",
  approved: "border-success/30 text-success",
  rejected: "border-destructive/30 text-destructive",
  cancelled: "border-destructive/30 text-destructive",
};

export function StockCountStatusBadge({
  status,
}: {
  status: StockCountStatus;
}) {
  return (
    <Badge variant="outline" className={cn(TONES[status])}>
      {STOCK_COUNT_STATUS_LABELS[status]}
    </Badge>
  );
}
