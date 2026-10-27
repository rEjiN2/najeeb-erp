import { RETURN_KINDS } from "@/features/returns/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={RETURN_KINDS.sales.config} />;
}
