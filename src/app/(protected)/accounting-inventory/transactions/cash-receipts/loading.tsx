import { CASH_RECEIPT_CONFIG } from "@/features/cash-receipts/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={CASH_RECEIPT_CONFIG} />;
}
