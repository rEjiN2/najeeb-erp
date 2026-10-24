import type { Metadata } from "next";

import { OpeningStockEditRoute } from "@/features/opening-stock/routes";

export const metadata: Metadata = {
  title: "Edit Opening Stock | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OpeningStockEditRoute id={(await params).id} />;
}
