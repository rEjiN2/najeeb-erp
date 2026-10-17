import { CASH_HANDOVER_CONFIG } from "@/features/cash-handovers/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={CASH_HANDOVER_CONFIG} />;
}
