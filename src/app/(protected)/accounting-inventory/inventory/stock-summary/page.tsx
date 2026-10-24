import type { Metadata } from "next";

import { StockSummaryRoute } from "@/features/stock/routes";

export const metadata: Metadata = {
  title: "Stock Summary | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StockSummaryRoute searchParams={await searchParams} />;
}
