import type { Metadata } from "next";

import { StockHistoryRoute } from "@/features/stock/routes";

export const metadata: Metadata = {
  title: "Stock History | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StockHistoryRoute searchParams={await searchParams} />;
}
