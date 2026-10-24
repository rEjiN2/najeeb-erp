import type { Metadata } from "next";

import { OpeningStockListRoute } from "@/features/opening-stock/routes";

export const metadata: Metadata = {
  title: "Opening Stock | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <OpeningStockListRoute searchParams={await searchParams} />;
}
