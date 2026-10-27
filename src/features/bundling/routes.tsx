import "server-only";

import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { isOwnScope } from "@/features/auth/session";
import { getVisibleStockLocations } from "@/features/stock/api";
import { getVoucherAccess } from "@/features/vouchers/access";
import { LoadFailure } from "@/features/vouchers/load-failure";
import { isMissing } from "@/features/vouchers/routes";
import { VoucherView } from "@/features/vouchers/view/voucher-view";
import {
  ManageForbidden,
  VoucherListHeading,
} from "@/features/vouchers/voucher-states";
import { uaeToday } from "@/lib/datetime";

import { cancelBundling } from "./actions";
import { getBundleOptions, getBundling, getBundlings } from "./api";
import { BundlingForm } from "./bundling-form";
import { BundlingList } from "./bundling-list";
import { BundlingParts } from "./bundling-parts";
import {
  BUNDLING_CONFIG as config,
  BUNDLING_PATH,
  bundlingPath,
} from "./constants";
import { parseBundlingFilters, toBundlingSearch } from "./filters";

type SearchParams = Record<string, string | string[] | undefined>;

const header = (title: string) => (
  <VoucherToolbar
    title={title}
    back={{ href: BUNDLING_PATH, label: config.title }}
  />
);

export async function BundlingListRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseBundlingFilters(searchParams);
  const [page, access, locations, bundles] = await Promise.all([
    getBundlings(filters),
    getVoucherAccess(config),
    getVisibleStockLocations(),
    getBundleOptions(),
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={`${BUNDLING_PATH}${toBundlingSearch(filters)}`}
        subject="bundlings"
        header={<VoucherListHeading config={config} />}
      />
    );
  }
  return (
    <BundlingList
      page={page.data}
      filters={filters}
      access={access}
      locations={locations.ok ? locations.data : null}
      bundles={bundles.ok ? bundles.data : null}
    />
  );
}

export async function BundlingNewRoute() {
  const title = "New Bundling";
  if (!(await getVoucherAccess(config)).canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }
  const [locations, bundles, scoped] = await Promise.all([
    getVisibleStockLocations(),
    getBundleOptions(),
    isOwnScope(),
  ]);
  for (const result of [locations, bundles]) {
    if (!result.ok) {
      return (
        <LoadFailure
          failure={result}
          returnTo={`${BUNDLING_PATH}/new`}
          subject="locations and bundles"
          header={header(title)}
        />
      );
    }
  }
  if (!locations.ok || !bundles.ok) return null;
  return (
    <BundlingForm
      today={uaeToday()}
      locations={locations.data}
      bundles={bundles.data}
      lockLocation={scoped && locations.data.length === 1}
    />
  );
}

export async function BundlingDetailRoute({
  id,
  searchParams,
}: {
  id: string;
  searchParams: SearchParams;
}) {
  const [result, access] = await Promise.all([
    getBundling(id),
    getVoucherAccess(config),
  ]);
  if (!result.ok) {
    if (isMissing(result)) notFound();
    return (
      <LoadFailure
        failure={result}
        returnTo={bundlingPath(id)}
        subject="this bundling"
        header={header(config.singular)}
      />
    );
  }
  return (
    <VoucherView
      config={config}
      cancelAction={cancelBundling}
      voucher={result.data.voucher}
      access={access}
      justSaved={searchParams.saved === "1"}
      body={<BundlingParts detail={result.data.detail} />}
    />
  );
}
