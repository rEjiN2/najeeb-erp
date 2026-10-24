import { OPENING_BALANCE_CONFIG } from "@/features/opening-balances/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={OPENING_BALANCE_CONFIG} />;
}
