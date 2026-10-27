import type { Metadata } from "next";

import { StockCountListRoute } from "@/features/stock-counts/routes";

export const metadata: Metadata = {
  title: "Stock Counts | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StockCountListRoute searchParams={await searchParams} />;
}
