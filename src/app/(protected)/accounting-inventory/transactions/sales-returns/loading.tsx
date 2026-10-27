import { RETURN_KINDS } from "@/features/returns/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={RETURN_KINDS.sales.config} />;
}
