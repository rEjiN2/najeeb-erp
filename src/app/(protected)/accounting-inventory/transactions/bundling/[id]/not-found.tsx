import { BUNDLING_CONFIG } from "@/features/bundling/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={BUNDLING_CONFIG} />;
}
