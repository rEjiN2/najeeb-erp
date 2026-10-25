import { PURCHASE_INVOICE_CONFIG } from "@/features/purchase-invoices/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={PURCHASE_INVOICE_CONFIG} />;
}
