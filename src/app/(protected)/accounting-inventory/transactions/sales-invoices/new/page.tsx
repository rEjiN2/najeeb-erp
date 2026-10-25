import type { Metadata } from "next";

import { SalesInvoiceNewRoute } from "@/features/sales-invoices/routes";

export const metadata: Metadata = {
  title: "New Sales Invoice | ALA Dates",
};

export default function Page() {
  return <SalesInvoiceNewRoute />;
}
