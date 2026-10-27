import type { Metadata } from "next";

import { StockCountDetailRoute } from "@/features/stock-counts/routes";

export const metadata: Metadata = {
  title: "Stock Count | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <StockCountDetailRoute id={id} searchParams={query} />;
}
