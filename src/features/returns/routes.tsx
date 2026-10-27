import "server-only";

import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { getSupplierName as getPartyName } from "@/features/purchase-invoices/api";
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

import { cancelPurchaseReturn, cancelSalesReturn } from "./actions";
import { getInvoiceNo, getReturn, getReturns, getReturnSource } from "./api";
import { RETURN_KINDS, returnPath } from "./constants";
import { parseReturnFilters, toReturnSearch } from "./filters";
import { ReturnForm } from "./return-form";
import { ReturnLines } from "./return-lines";
import { ReturnList } from "./return-list";
import type { ReturnKind } from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

const ID = /^[a-f\d]{24}$/i;

export async function ReturnListRoute({
  kind,
  searchParams,
}: {
  kind: ReturnKind;
  searchParams: SearchParams;
}) {
  const info = RETURN_KINDS[kind];
  const filters = parseReturnFilters(searchParams);
  const [page, access, partyName, invoiceNo] = await Promise.all([
    getReturns(kind, filters),
    getVoucherAccess(info.config),
    getPartyName(filters.partyId),
    getInvoiceNo(kind, filters.invoiceId),
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={`${info.path}${toReturnSearch(filters)}`}
        subject={info.config.nounPlural}
        header={<VoucherListHeading config={info.config} />}
      />
    );
  }
  return (
    <ReturnList
      kind={kind}
      page={page.data}
      filters={filters}
      access={access}
      partyName={partyName}
      invoiceNo={invoiceNo}
    />
  );
}

/** /new picks the invoice; /new?invoice=<id> shows its lines. */
export async function ReturnNewRoute({
  kind,
  searchParams,
}: {
  kind: ReturnKind;
  searchParams: SearchParams;
}) {
  const info = RETURN_KINDS[kind];
  const title = `New ${info.config.singular}`;
  if (!(await getVoucherAccess(info.config)).canCreate) {
    return (
      <ManageForbidden config={info.config} title={title} action="create" />
    );
  }
  const param = searchParams.invoice;
  const invoiceId = (Array.isArray(param) ? param[0] : param) ?? "";
  const returnTo = `${info.path}/new${invoiceId ? `?invoice=${invoiceId}` : ""}`;
  const [locations, source] = await Promise.all([
    getVisibleStockLocations(),
    ID.test(invoiceId) ? getReturnSource(kind, invoiceId) : null,
  ]);
  for (const result of [locations, source]) {
    if (result && !result.ok) {
      if (isMissing(result)) notFound();
      return (
        <LoadFailure
          failure={result}
          returnTo={returnTo}
          subject={`the ${info.config.noun} form`}
          header={
            <VoucherToolbar
              title={title}
              back={{ href: info.path, label: info.config.title }}
            />
          }
        />
      );
    }
  }
  if (!locations.ok) return null;
  return (
    <ReturnForm
      // A new invoice starts a clean form.
      key={invoiceId}
      kind={kind}
      source={source?.ok ? source.data : null}
      today={uaeToday()}
      locations={locations.data}
    />
  );
}

export async function ReturnDetailRoute({
  kind,
  id,
  searchParams,
}: {
  kind: ReturnKind;
  id: string;
  searchParams: SearchParams;
}) {
  const info = RETURN_KINDS[kind];
  const [detail, access] = await Promise.all([
    getReturn(kind, id),
    getVoucherAccess(info.config),
  ]);
  if (!detail.ok) {
    if (isMissing(detail)) notFound();
    return (
      <LoadFailure
        failure={detail}
        returnTo={returnPath(kind, id)}
        subject={`this ${info.config.noun}`}
        header={
          <VoucherToolbar
            title={info.config.singular}
            back={{ href: info.path, label: info.config.title }}
          />
        }
      />
    );
  }
  return (
    <VoucherView
      config={info.config}
      cancelAction={kind === "sales" ? cancelSalesReturn : cancelPurchaseReturn}
      voucher={detail.data.voucher}
      // A return can't be edited: cancel it and enter a new one.
      access={{ ...access, canEdit: false }}
      justSaved={searchParams.saved === "1"}
      body={<ReturnLines kind={kind} detail={detail.data} />}
    />
  );
}
