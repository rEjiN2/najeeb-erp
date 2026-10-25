import type { Metadata } from "next";

import { SalesInvoiceListRoute } from "@/features/sales-invoices/routes";

export const metadata: Metadata = {
  title: "Sales Invoices | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SalesInvoiceListRoute searchParams={await searchParams} />;
}
