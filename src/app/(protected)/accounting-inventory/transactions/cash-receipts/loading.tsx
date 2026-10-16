import { MasterTableSkeleton } from "@/components/master/master-states";
import {
  CASH_RECEIPTS_DESCRIPTION,
  CASH_RECEIPTS_TITLE,
} from "@/features/cash-receipts/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {CASH_RECEIPTS_TITLE}
        </h1>
        <p className="text-muted-foreground text-sm">
          {CASH_RECEIPTS_DESCRIPTION}
        </p>
      </div>
      <div className="bg-muted h-28 animate-pulse rounded-lg" />
      <div className="bg-muted h-20 animate-pulse rounded-lg" />
      <MasterTableSkeleton rows={8} />
    </div>
  );
}
