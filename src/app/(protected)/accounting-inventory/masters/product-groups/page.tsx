import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterLoadError } from "@/components/master/master-states";
import { getProductGroups } from "@/features/product-groups/api";
import {
  PRODUCT_GROUPS_DESCRIPTION,
  PRODUCT_GROUPS_PATH,
  PRODUCT_GROUPS_TITLE,
} from "@/features/product-groups/constants";
import { ProductGroupsPage } from "@/features/product-groups/product-groups-page";

export const metadata: Metadata = {
  title: "Product Groups | ALA Dates",
};

export default async function Page() {
  const result = await getProductGroups();

  if (result.ok) {
    return <ProductGroupsPage productGroups={result.data} />;
  }

  if (result.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: PRODUCT_GROUPS_PATH })}`);
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={PRODUCT_GROUPS_TITLE}
        description={PRODUCT_GROUPS_DESCRIPTION}
      />
      <MasterLoadError
        reason={result.reason}
        subject="product groups"
        status={result.status}
      />
    </div>
  );
}
