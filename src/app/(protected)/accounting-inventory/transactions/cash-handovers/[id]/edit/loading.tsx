import { CASH_HANDOVER_CONFIG } from "@/features/cash-handovers/constants";
import { VoucherPageSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return (
    <VoucherPageSkeleton
      config={CASH_HANDOVER_CONFIG}
      title="Edit Cash Handover"
    />
  );
}
