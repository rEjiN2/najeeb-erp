import type { Metadata } from "next";

import { StockCountEditRoute } from "@/features/stock-counts/routes";

export const metadata: Metadata = {
  title: "Count Stock | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <StockCountEditRoute id={(await params).id} />;
}
