import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterLoadError } from "@/components/master/master-states";
import { getProductGroups } from "@/features/product-groups/api";
import {
  canManageProducts,
  canViewCost,
  getProducts,
  parseProductFilters,
} from "@/features/products/api";
import {
  PRODUCTS_DESCRIPTION,
  PRODUCTS_PATH,
  PRODUCTS_TITLE,
} from "@/features/products/constants";
import { ProductsPage } from "@/features/products/products-page";
import { getUnits } from "@/features/units/api";

export const metadata: Metadata = {
  title: "Products | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseProductFilters(await searchParams);
  const [products, groups, units, canManage, viewCost] = await Promise.all([
    getProducts(filters),
    getProductGroups(),
    getUnits(),
    canManageProducts(),
    canViewCost(),
  ]);

  // The list needs all three: groups and units fill its filter and form.
  const failure = [products, groups, units].find((result) => !result.ok);
  if (failure && !failure.ok) {
    if (failure.reason === "unauthorized") {
      redirect(`/login?${new URLSearchParams({ from: PRODUCTS_PATH })}`);
    }
    return (
      <div className="space-y-6">
        <MasterPageHeader
          title={PRODUCTS_TITLE}
          description={PRODUCTS_DESCRIPTION}
        />
        <MasterLoadError
          reason={failure.reason}
          subject="products"
          status={failure.status}
          messages={failure.messages}
        />
      </div>
    );
  }

  return (
    <ProductsPage
      page={
        products.ok
          ? products.data
          : { items: [], total: 0, page: 1, limit: 20 }
      }
      filters={filters}
      groups={groups.ok ? groups.data : []}
      units={units.ok ? units.data : []}
      canManage={canManage}
      canViewCost={viewCost}
    />
  );
}
