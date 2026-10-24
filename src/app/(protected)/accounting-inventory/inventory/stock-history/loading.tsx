import { MasterTableSkeleton } from "@/components/master/master-states";
import {
  STOCK_HISTORY_DESCRIPTION,
  STOCK_HISTORY_TITLE,
} from "@/features/stock/constants";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {STOCK_HISTORY_TITLE}
        </h1>
        <p className="text-muted-foreground text-sm">
          {STOCK_HISTORY_DESCRIPTION}
        </p>
      </div>
      <div className="bg-muted h-16 animate-pulse rounded-lg" />
      <MasterTableSkeleton rows={8} />
    </div>
  );
}
