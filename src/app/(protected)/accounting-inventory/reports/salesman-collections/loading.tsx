import { MasterTableSkeleton } from "@/components/master/master-states";
import {
  SALESMAN_COLLECTIONS_DESCRIPTION,
  SALESMAN_COLLECTIONS_TITLE,
} from "@/features/reports/salesman-collections/constants";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {SALESMAN_COLLECTIONS_TITLE}
        </h1>
        <p className="text-muted-foreground text-sm">
          {SALESMAN_COLLECTIONS_DESCRIPTION}
        </p>
      </div>
      <div className="bg-muted h-16 animate-pulse rounded-lg" />
      <MasterTableSkeleton rows={6} />
    </div>
  );
}
