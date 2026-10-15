import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";
import {
  LOCATIONS_DESCRIPTION,
  LOCATIONS_TITLE,
} from "@/features/locations/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={LOCATIONS_TITLE}
        description={LOCATIONS_DESCRIPTION}
      />
      <MasterTableSkeleton />
    </div>
  );
}
