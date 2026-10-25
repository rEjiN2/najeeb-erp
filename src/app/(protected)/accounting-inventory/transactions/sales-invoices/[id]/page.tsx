import type { Metadata } from "next";

import { SalesInvoiceDetailRoute } from "@/features/sales-invoices/routes";

export const metadata: Metadata = {
  title: "Sales Invoice | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <SalesInvoiceDetailRoute id={id} searchParams={query} />;
}
