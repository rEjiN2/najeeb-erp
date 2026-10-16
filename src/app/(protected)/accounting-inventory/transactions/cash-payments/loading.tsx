import { CASH_PAYMENT_CONFIG } from "@/features/cash-payments/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={CASH_PAYMENT_CONFIG} />;
}
