import type { Metadata } from "next";

import { ProductGroupsPage } from "@/features/product-groups/product-groups-page";

export const metadata: Metadata = {
  title: "Product Groups | ALA Dates",
};

export default function Page() {
  return <ProductGroupsPage />;
}
