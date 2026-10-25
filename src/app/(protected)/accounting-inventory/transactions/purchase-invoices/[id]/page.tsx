import type { Metadata } from "next";

import { PurchaseInvoiceDetailRoute } from "@/features/purchase-invoices/routes";

export const metadata: Metadata = {
  title: "Purchase Invoice | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <PurchaseInvoiceDetailRoute id={id} searchParams={query} />;
}
