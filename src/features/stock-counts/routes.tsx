import "server-only";

import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession } from "@/features/auth/session";
import { getProductGroups } from "@/features/product-groups/api";
import { getVisibleStockLocations } from "@/features/stock/api";
import { LoadFailure } from "@/features/vouchers/load-failure";
import { isMissing } from "@/features/vouchers/routes";
import {
  ManageForbidden,
  VoucherListHeading,
} from "@/features/vouchers/voucher-states";
import { uaeToday } from "@/lib/datetime";

import { getStockCount, getStockCounts } from "./api";
import {
  STOCK_COUNT_CONFIG as config,
  STOCK_COUNTS_PATH,
  stockCountPath,
} from "./constants";
import { parseStockCountFilters, toStockCountSearch } from "./filters";
import { StockCountForm } from "./stock-count-form";
import { StockCountList } from "./stock-count-list";
import { StockCountView } from "./stock-count-view";

type SearchParams = Record<string, string | string[] | undefined>;

const header = (title: string) => (
  <VoucherToolbar
    title={title}
    back={{ href: STOCK_COUNTS_PATH, label: config.title }}
  />
);

/** Only decides what the UI offers — the backend checks each permission. */
async function getAccess() {
  const session = await getServerSession();
  const permissions = session?.user.permissions ?? [];
  return {
    canCreate: permissions.includes("stock-counts:create"),
    canApprove: permissions.includes("stock-counts:approve"),
    canCancel: permissions.includes("stock-counts:cancel"),
    canSystem: permissions.includes(PERMISSIONS.STOCK_VIEW_SYSTEM_QTY),
    userId: session?.user.id ?? "",
    scoped: session?.user.dataScope === "own",
  };
}

export async function StockCountListRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseStockCountFilters(searchParams);
  const [page, access, locations] = await Promise.all([
    getStockCounts(filters),
    getAccess(),
    getVisibleStockLocations(),
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={`${STOCK_COUNTS_PATH}${toStockCountSearch(filters)}`}
        subject="stock counts"
        header={<VoucherListHeading config={config} />}
      />
    );
  }
  return (
    <StockCountList
      page={page.data}
      filters={filters}
      access={access}
      locations={locations.ok ? locations.data : null}
    />
  );
}

export async function StockCountNewRoute() {
  const title = "New Stock Count";
  const access = await getAccess();
  if (!access.canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }
  const [locations, groups] = await Promise.all([
    getVisibleStockLocations(),
    getProductGroups(),
  ]);
  if (!locations.ok) {
    return (
      <LoadFailure
        failure={locations}
        returnTo={`${STOCK_COUNTS_PATH}/new`}
        subject="locations"
        header={header(title)}
      />
    );
  }
  return (
    <StockCountForm
      today={uaeToday()}
      locations={locations.data}
      groups={groups.ok ? groups.data : null}
      canSystem={access.canSystem}
      lockLocation={access.scoped && locations.data.length === 1}
    />
  );
}

export async function StockCountDetailRoute({
  id,
  searchParams,
}: {
  id: string;
  searchParams: SearchParams;
}) {
  const [detail, access] = await Promise.all([getStockCount(id), getAccess()]);
  if (!detail.ok) {
    if (isMissing(detail)) notFound();
    return (
      <LoadFailure
        failure={detail}
        returnTo={stockCountPath(id)}
        subject="this stock count"
        header={header(config.singular)}
      />
    );
  }
  return (
    <StockCountView
      detail={detail.data}
      access={access}
      justSaved={searchParams.saved === "1"}
    />
  );
}

export async function StockCountEditRoute({ id }: { id: string }) {
  const title = "Count stock";
  const access = await getAccess();
  if (!access.canCreate) {
    return <ManageForbidden config={config} title={title} action="edit" />;
  }
  const [detail, locations, groups] = await Promise.all([
    getStockCount(id),
    getVisibleStockLocations(),
    getProductGroups(),
  ]);
  for (const result of [detail, locations]) {
    if (!result.ok) {
      if (isMissing(result)) notFound();
      return (
        <LoadFailure
          failure={result}
          returnTo={`${stockCountPath(id)}/edit`}
          subject="this stock count"
          header={header(title)}
        />
      );
    }
  }
  if (!detail.ok || !locations.ok) return null;
  const count = detail.data;
  // Only the creator changes a draft; everyone else gets the read-only view.
  if (count.status !== "draft" || count.createdBy?.id !== access.userId) {
    return <StockCountView detail={count} access={access} justSaved={false} />;
  }
  return (
    <StockCountForm
      // Remounts with the server's lines after "Load products".
      key={count.updatedAt ?? count.createdAt ?? count.id}
      today={uaeToday()}
      locations={locations.data}
      groups={groups.ok ? groups.data : null}
      canSystem={access.canSystem}
      lockLocation={access.scoped && locations.data.length === 1}
      existing={{
        id,
        voucherNo: count.voucherNo,
        date: count.date,
        locationId: count.location.id,
        comments: count.comments ?? "",
        lines: count.lines,
      }}
    />
  );
}
