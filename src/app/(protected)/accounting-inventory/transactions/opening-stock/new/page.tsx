import type { Metadata } from "next";

import { OpeningStockNewRoute } from "@/features/opening-stock/routes";

export const metadata: Metadata = {
  title: "New Opening Stock | ALA Dates",
};

export default function Page() {
  return <OpeningStockNewRoute />;
}
