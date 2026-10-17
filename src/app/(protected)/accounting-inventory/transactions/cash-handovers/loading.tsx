import { CASH_HANDOVER_CONFIG } from "@/features/cash-handovers/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={CASH_HANDOVER_CONFIG} />;
}
