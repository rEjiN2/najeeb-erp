import { CASH_PAYMENT_CONFIG } from "@/features/cash-payments/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={CASH_PAYMENT_CONFIG} />;
}
