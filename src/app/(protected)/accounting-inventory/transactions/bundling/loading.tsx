import { BUNDLING_CONFIG } from "@/features/bundling/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={BUNDLING_CONFIG} />;
}
