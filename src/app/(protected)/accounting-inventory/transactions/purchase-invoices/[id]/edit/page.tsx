import type { Metadata } from "next";

import { PurchaseInvoiceEditRoute } from "@/features/purchase-invoices/routes";

export const metadata: Metadata = {
  title: "Edit Purchase Invoice | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PurchaseInvoiceEditRoute id={(await params).id} />;
}
