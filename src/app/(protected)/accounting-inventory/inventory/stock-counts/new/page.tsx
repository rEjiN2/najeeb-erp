import type { Metadata } from "next";

import { StockCountNewRoute } from "@/features/stock-counts/routes";

export const metadata: Metadata = {
  title: "New Stock Count | ALA Dates",
};

export default function Page() {
  return <StockCountNewRoute />;
}
