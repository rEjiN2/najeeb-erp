import type { Metadata } from "next";

import { SalesInvoiceEditRoute } from "@/features/sales-invoices/routes";

export const metadata: Metadata = {
  title: "Edit Sales Invoice | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SalesInvoiceEditRoute id={(await params).id} />;
}
