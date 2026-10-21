import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";
import { UNITS_DESCRIPTION, UNITS_TITLE } from "@/features/units/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader title={UNITS_TITLE} description={UNITS_DESCRIPTION} />
      <MasterTableSkeleton rows={4} />
    </div>
  );
}
