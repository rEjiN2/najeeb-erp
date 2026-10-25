import type { Metadata } from "next";

import { PurchaseInvoiceNewRoute } from "@/features/purchase-invoices/routes";

export const metadata: Metadata = {
  title: "New Purchase Invoice | ALA Dates",
};

export default function Page() {
  return <PurchaseInvoiceNewRoute />;
}
