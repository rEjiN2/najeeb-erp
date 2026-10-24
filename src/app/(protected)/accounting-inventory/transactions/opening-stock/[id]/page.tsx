import type { Metadata } from "next";

import { OpeningStockDetailRoute } from "@/features/opening-stock/routes";

export const metadata: Metadata = {
  title: "Opening Stock | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <OpeningStockDetailRoute id={id} searchParams={query} />;
}
