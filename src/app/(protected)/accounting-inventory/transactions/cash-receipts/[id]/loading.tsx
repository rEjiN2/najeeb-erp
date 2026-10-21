import { CASH_RECEIPT_CONFIG } from "@/features/cash-receipts/constants";
import { VoucherPageSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return (
    <VoucherPageSkeleton config={CASH_RECEIPT_CONFIG} title="Receipt" />
  );
}
