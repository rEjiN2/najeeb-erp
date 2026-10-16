import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";
import { ROLES_DESCRIPTION, ROLES_TITLE } from "@/features/roles/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader title={ROLES_TITLE} description={ROLES_DESCRIPTION} />
      <MasterTableSkeleton />
    </div>
  );
}
