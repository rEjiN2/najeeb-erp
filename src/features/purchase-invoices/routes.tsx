import "server-only";

import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { PERMISSIONS } from "@/features/auth/permissions";
import { CASH_PAYMENTS_PATH } from "@/features/cash-payments/constants";
import { hasPermission } from "@/features/auth/session";
import { getProductGroups } from "@/features/product-groups/api";
import { getVisibleStockLocations } from "@/features/stock/api";
import { getUnits } from "@/features/units/api";
import { getInvoiceReturns } from "@/features/returns/api";
import { RETURN_KINDS } from "@/features/returns/constants";
import { InvoiceReturns } from "@/features/returns/invoice-returns";
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

import { cancelPurchaseInvoice } from "./actions";
import {
  getPurchaseInvoice,
  getPurchaseInvoices,
  getSupplierName,
} from "./api";
import {
  PURCHASE_INVOICE_CONFIG as config,
  PURCHASE_INVOICES_PATH,
  purchaseInvoicePath,
} from "./constants";
import {
  parsePurchaseInvoiceFilters,
  toPurchaseInvoiceSearch,
} from "./filters";
import { PurchaseInvoiceForm } from "./purchase-invoice-form";
import { InvoicePayments } from "./invoice-payments";
import {
  PaymentStatusBadge,
  PurchaseInvoiceLines,
} from "./purchase-invoice-lines";
import { PurchaseInvoiceList } from "./purchase-invoice-list";

type SearchParams = Record<string, string | string[] | undefined>;

/** What "Add product" needs, for users with products:manage; null otherwise
 * (or when groups/units can't be loaded — the picker still works). */
async function getProductMaster() {
  if (!(await hasPermission(PERMISSIONS.PRODUCTS_MANAGE))) return null;
  const [groups, units, canViewCost] = await Promise.all([
    getProductGroups(),
    getUnits(),
    hasPermission(PERMISSIONS.PRODUCTS_VIEW_COST),
  ]);
  if (!groups.ok || !units.ok) return null;
  return { groups: groups.data, units: units.data, canViewCost };
}

const header = (title: string) => (
  <VoucherToolbar
    title={title}
    back={{ href: PURCHASE_INVOICES_PATH, label: config.title }}
  />
);

export async function PurchaseInvoiceListRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parsePurchaseInvoiceFilters(searchParams);
  const [page, access, locations, supplierName] = await Promise.all([
    getPurchaseInvoices(filters),
    getVoucherAccess(config),
    getVisibleStockLocations(),
    getSupplierName(filters.supplierId),
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={`${PURCHASE_INVOICES_PATH}${toPurchaseInvoiceSearch(filters)}`}
        subject="purchase invoices"
        header={<VoucherListHeading config={config} />}
      />
    );
  }
  return (
    <PurchaseInvoiceList
      page={page.data}
      filters={filters}
      access={access}
      locations={locations.ok ? locations.data : null}
      supplierName={supplierName}
    />
  );
}

export async function PurchaseInvoiceNewRoute() {
  const title = "New Purchase Invoice";
  if (!(await getVoucherAccess(config)).canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }
  const [locations, canAddSupplier, productMaster] = await Promise.all([
    getVisibleStockLocations(),
    hasPermission(PERMISSIONS.PARTIES_MANAGE),
    getProductMaster(),
  ]);
  if (!locations.ok) {
    return (
      <LoadFailure
        failure={locations}
        returnTo={`${PURCHASE_INVOICES_PATH}/new`}
        subject="locations"
        header={header(title)}
      />
    );
  }
  return (
    <PurchaseInvoiceForm
      today={uaeToday()}
      locations={locations.data}
      canAddSupplier={canAddSupplier}
      productMaster={productMaster}
    />
  );
}

export async function PurchaseInvoiceDetailRoute({
  id,
  searchParams,
}: {
  id: string;
  searchParams: SearchParams;
}) {
  const [detail, access, returnAccess, returns, canPay, canAllocate] =
    await Promise.all([
      getPurchaseInvoice(id),
      getVoucherAccess(config),
      getVoucherAccess(RETURN_KINDS.purchase.config),
      getInvoiceReturns("purchase", id),
      hasPermission(PERMISSIONS.CASH_PAYMENTS_CREATE),
      hasPermission(PERMISSIONS.ALLOCATIONS_MANAGE),
    ]);
  if (!detail.ok) {
    if (isMissing(detail)) notFound();
    return (
      <LoadFailure
        failure={detail}
        returnTo={purchaseInvoicePath(id)}
        subject="this purchase invoice"
        header={header(config.singular)}
      />
    );
  }
  const { voucher } = detail.data;
  return (
    <VoucherView
      config={config}
      cancelAction={cancelPurchaseInvoice}
      voucher={voucher}
      access={access}
      justSaved={searchParams.saved === "1"}
      extraBadge={
        voucher.status === "posted" ? (
          <PaymentStatusBadge
            status={detail.data.paymentStatus}
            overdue={detail.data.overdue}
          />
        ) : null
      }
      body={
        <>
          <PurchaseInvoiceLines detail={detail.data} />
          <InvoicePayments
            invoiceId={id}
            supplierId={detail.data.supplierId}
            balance={detail.data.balance}
            posted={voucher.status === "posted"}
            payHref={
              canPay
                ? `${CASH_PAYMENTS_PATH}/new?${new URLSearchParams({ supplier: detail.data.supplierId, bill: id })}`
                : null
            }
            canAllocate={canAllocate}
            allocations={detail.data.allocations}
          />
          {returns.ok ? (
            <InvoiceReturns
              kind="purchase"
              invoiceId={id}
              returns={returns.data}
              canCreate={
                returnAccess.canCreate &&
                voucher.status === "posted" &&
                detail.data.lines.some(
                  (line) => line.qty - (line.returnedQty ?? 0) > 0,
                )
              }
            />
          ) : null}
        </>
      }
    />
  );
}

export async function PurchaseInvoiceEditRoute({ id }: { id: string }) {
  const title = "Edit Purchase Invoice";
  if (!(await getVoucherAccess(config)).canEdit) {
    return <ManageForbidden config={config} title={title} action="edit" />;
  }
  const [detail, locations, canAddSupplier, productMaster] = await Promise.all([
    getPurchaseInvoice(id),
    getVisibleStockLocations(),
    hasPermission(PERMISSIONS.PARTIES_MANAGE),
    getProductMaster(),
  ]);
  for (const result of [detail, locations]) {
    if (!result.ok) {
      if (isMissing(result)) notFound();
      return (
        <LoadFailure
          failure={result}
          returnTo={`${purchaseInvoicePath(id)}/edit`}
          subject="this purchase invoice"
          header={header(title)}
        />
      );
    }
  }
  if (!detail.ok || !locations.ok) return null;
  const data = detail.data;
  if (data.voucher.status === "cancelled") {
    return (
      <CancelledNotEditable
        config={config}
        id={id}
        voucherNo={data.voucher.voucherNo}
      />
    );
  }
  return (
    <PurchaseInvoiceForm
      today={uaeToday()}
      locations={locations.data}
      canAddSupplier={canAddSupplier}
      productMaster={productMaster}
      existing={{
        id,
        voucherNo: data.voucher.voucherNo,
        date: data.voucher.voucherDate,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        locationId: data.locationId,
        billNo: data.billNo,
        billDate: data.billDate,
        dueDate: data.dueDate,
        remarks: data.voucher.comments,
        attachmentFileRefs: data.attachmentFileRefs,
        updatePurchasePrice: data.updatePurchasePrice,
        lines: data.lines,
      }}
    />
  );
}
