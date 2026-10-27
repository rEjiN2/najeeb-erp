import { STOCK_COUNT_CONFIG } from "@/features/stock-counts/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={STOCK_COUNT_CONFIG} />;
}
