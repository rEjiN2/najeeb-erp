import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";
import {
  ACCOUNTS_DESCRIPTION,
  ACCOUNTS_TITLE,
} from "@/features/accounts/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={ACCOUNTS_TITLE}
        description={ACCOUNTS_DESCRIPTION}
      />
      <MasterTableSkeleton />
    </div>
  );
}
