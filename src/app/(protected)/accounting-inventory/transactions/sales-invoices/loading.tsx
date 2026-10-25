import { SALES_INVOICE_CONFIG } from "@/features/sales-invoices/constants";
import { VoucherListSkeleton } from "@/features/vouchers/voucher-states";

export default function Loading() {
  return <VoucherListSkeleton config={SALES_INVOICE_CONFIG} />;
}
