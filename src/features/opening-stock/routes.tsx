import "server-only";

import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { getVisibleStockLocations } from "@/features/stock/api";
import { getVoucherAccess } from "@/features/vouchers/access";
import { LoadFailure } from "@/features/vouchers/load-failure";
import { isMissing } from "@/features/vouchers/routes";
import { VoucherView } from "@/features/vouchers/view/voucher-view";
import {
  CancelledNotEditable,
  ManageForbidden,
  VoucherListHeading,
} from "@/features/vouchers/voucher-states";
import { uaeToday } from "@/lib/datetime";

import { cancelOpeningStock } from "./actions";
import { getOpeningStock, getOpeningStocks } from "./api";
import {
  OPENING_STOCK_CONFIG as config,
  OPENING_STOCK_PATH,
  openingStockPath,
} from "./constants";
import { parseOpeningStockFilters, toOpeningStockSearch } from "./filters";
import { OpeningStockForm } from "./opening-stock-form";
import { OpeningStockLines } from "./opening-stock-lines";
import { OpeningStockList } from "./opening-stock-list";

type SearchParams = Record<string, string | string[] | undefined>;

const header = (title: string) => (
  <VoucherToolbar
    title={title}
    back={{ href: OPENING_STOCK_PATH, label: config.title }}
  />
);

export async function OpeningStockListRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseOpeningStockFilters(searchParams);
  const [page, access, locations] = await Promise.all([
    getOpeningStocks(filters),
    getVoucherAccess(config),
    getVisibleStockLocations(),
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={`${OPENING_STOCK_PATH}${toOpeningStockSearch(filters)}`}
        subject="opening stock"
        header={<VoucherListHeading config={config} />}
      />
    );
  }
  return (
    <OpeningStockList
      page={page.data}
      filters={filters}
      access={access}
      locations={locations.ok ? locations.data : null}
    />
  );
}

export async function OpeningStockNewRoute() {
  const title = "New Opening Stock";
  if (!(await getVoucherAccess(config)).canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }
  const locations = await getVisibleStockLocations();
  if (!locations.ok) {
    return (
      <LoadFailure
        failure={locations}
        returnTo={`${OPENING_STOCK_PATH}/new`}
        subject="locations"
        header={header(title)}
      />
    );
  }
  return <OpeningStockForm today={uaeToday()} locations={locations.data} />;
}

export async function OpeningStockDetailRoute({
  id,
  searchParams,
}: {
  id: string;
  searchParams: SearchParams;
}) {
  const [detail, access] = await Promise.all([
    getOpeningStock(id),
    getVoucherAccess(config),
  ]);
  if (!detail.ok) {
    if (isMissing(detail)) notFound();
    return (
      <LoadFailure
        failure={detail}
        returnTo={openingStockPath(id)}
        subject="this opening stock"
        header={header(config.singular)}
      />
    );
  }
  return (
    <VoucherView
      config={config}
      cancelAction={cancelOpeningStock}
      voucher={detail.data.voucher}
      access={access}
      justSaved={searchParams.saved === "1"}
      body={<OpeningStockLines detail={detail.data} />}
    />
  );
}

export async function OpeningStockEditRoute({ id }: { id: string }) {
  const title = "Edit Opening Stock";
  if (!(await getVoucherAccess(config)).canEdit) {
    return <ManageForbidden config={config} title={title} action="edit" />;
  }
  const [detail, locations] = await Promise.all([
    getOpeningStock(id),
    getVisibleStockLocations(),
  ]);
  for (const result of [detail, locations]) {
    if (!result.ok) {
      if (isMissing(result)) notFound();
      return (
        <LoadFailure
          failure={result}
          returnTo={`${openingStockPath(id)}/edit`}
          subject="this opening stock"
          header={header(title)}
        />
      );
    }
  }
  if (!detail.ok || !locations.ok) return null;
  const { voucher, lines, locationId } = detail.data;
  if (voucher.status === "cancelled") {
    return (
      <CancelledNotEditable
        config={config}
        id={id}
        voucherNo={voucher.voucherNo}
      />
    );
  }
  return (
    <OpeningStockForm
      today={uaeToday()}
      locations={locations.data}
      existing={{
        id,
        voucherNo: voucher.voucherNo,
        asOfDate: voucher.voucherDate,
        locationId,
        comments: voucher.comments,
        lines,
      }}
    />
  );
}
