import { OPENING_BALANCE_CONFIG } from "@/features/opening-balances/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={OPENING_BALANCE_CONFIG} />;
}
