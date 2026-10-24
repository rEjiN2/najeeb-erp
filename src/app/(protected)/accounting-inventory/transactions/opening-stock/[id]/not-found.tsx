import { OPENING_STOCK_CONFIG } from "@/features/opening-stock/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={OPENING_STOCK_CONFIG} />;
}
