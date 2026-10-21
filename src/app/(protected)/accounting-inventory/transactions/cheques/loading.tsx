import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterTableSkeleton } from "@/components/master/master-states";

export default function Loading() {
  return (
    <div className="space-y-6">
      <MasterPageHeader
        title="Cheques"
        description="Cheques received on receipts: deposit, clear or return them."
      />
      <MasterTableSkeleton />
    </div>
  );
}
