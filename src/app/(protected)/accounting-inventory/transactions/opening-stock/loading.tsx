import { OPENING_STOCK_CONFIG } from "@/features/opening-stock/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={OPENING_STOCK_CONFIG} />;
}
