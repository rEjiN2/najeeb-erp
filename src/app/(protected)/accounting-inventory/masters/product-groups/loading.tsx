import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";
import {
  PRODUCT_GROUPS_DESCRIPTION,
  PRODUCT_GROUPS_TITLE,
} from "@/features/product-groups/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={PRODUCT_GROUPS_TITLE}
        description={PRODUCT_GROUPS_DESCRIPTION}
      />
      <MasterTableSkeleton />
    </div>
  );
}
