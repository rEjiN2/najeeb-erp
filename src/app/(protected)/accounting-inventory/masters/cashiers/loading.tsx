import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";
import {
  CASHIERS_DESCRIPTION,
  CASHIERS_TITLE,
} from "@/features/cashiers/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={CASHIERS_TITLE}
        description={CASHIERS_DESCRIPTION}
      />
      <MasterTableSkeleton />
    </div>
  );
}
