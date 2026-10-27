import { STOCK_COUNT_CONFIG } from "@/features/stock-counts/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={STOCK_COUNT_CONFIG} />;
}
