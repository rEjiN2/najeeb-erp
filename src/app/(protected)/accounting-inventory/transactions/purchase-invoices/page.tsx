import type { Metadata } from "next";

import { PurchaseInvoiceListRoute } from "@/features/purchase-invoices/routes";

export const metadata: Metadata = {
  title: "Purchase Invoices | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PurchaseInvoiceListRoute searchParams={await searchParams} />;
}
