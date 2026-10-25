import { SALES_INVOICE_CONFIG } from "@/features/sales-invoices/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={SALES_INVOICE_CONFIG} />;
}
