import { PURCHASE_INVOICE_CONFIG } from "@/features/purchase-invoices/constants";
import { VoucherNotFound } from "@/features/vouchers/voucher-states";

export default function NotFound() {
  return <VoucherNotFound config={PURCHASE_INVOICE_CONFIG} />;
}
