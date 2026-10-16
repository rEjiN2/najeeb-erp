import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";
import { USERS_DESCRIPTION, USERS_TITLE } from "@/features/users/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader title={USERS_TITLE} description={USERS_DESCRIPTION} />
      <MasterTableSkeleton />
    </div>
  );
}
