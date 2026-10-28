import { REFERENCE_RECEIPT_CONFIG } from "@/features/cash-receipts/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={REFERENCE_RECEIPT_CONFIG} />;
}
