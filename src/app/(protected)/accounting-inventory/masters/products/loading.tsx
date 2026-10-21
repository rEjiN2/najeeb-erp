import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";
import {
  PRODUCTS_DESCRIPTION,
  PRODUCTS_TITLE,
} from "@/features/products/constants";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={PRODUCTS_TITLE}
        description={PRODUCTS_DESCRIPTION}
      />
      <MasterTableSkeleton />
    </div>
  );
}
