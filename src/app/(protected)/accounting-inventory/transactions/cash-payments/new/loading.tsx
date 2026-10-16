import { CASH_PAYMENT_CONFIG } from "@/features/cash-payments/constants";
import { VoucherPageSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return (
    <VoucherPageSkeleton
      config={CASH_PAYMENT_CONFIG}
      title="New Cash Payment"
    />
  );
}
