import "server-only";

import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission, isOwnScope } from "@/features/auth/session";
import {
  CASH_RECEIPT_CONFIG,
  NEW_CASH_RECEIPT_PATH,
} from "@/features/cash-receipts/constants";
import { CASH_RECEIPTS_MODULE } from "@/features/cash-receipts/module";
import { getSupplierName as getPartyName } from "@/features/purchase-invoices/api";
import { InvoicePayments } from "@/features/purchase-invoices/invoice-payments";
import {
  PaymentStatusBadge,
  PurchaseInvoiceLines,
} from "@/features/purchase-invoices/purchase-invoice-lines";
import { getVisibleStockLocations } from "@/features/stock/api";
import { getUsers } from "@/features/users/api";
import { getVoucherAccess } from "@/features/vouchers/access";
import { loadVoucherFormData } from "@/features/vouchers/form-data";
import { LoadFailure } from "@/features/vouchers/load-failure";
import { isMissing } from "@/features/vouchers/routes";
import { VoucherView } from "@/features/vouchers/view/voucher-view";
import {
  CancelledNotEditable,
  ManageForbidden,
  VoucherListHeading,
} from "@/features/vouchers/voucher-states";
import { uaeToday } from "@/lib/datetime";

import { cancelSalesInvoice } from "./actions";
import { getSalesInvoice, getSalesInvoices } from "./api";
import {
  SALES_INVOICE_CONFIG as config,
  SALES_INVOICES_PATH,
  salesInvoicePath,
} from "./constants";
import { parseSalesInvoiceFilters, toSalesInvoiceSearch } from "./filters";
import { SalesInvoiceForm } from "./sales-invoice-form";
import { SalesInvoiceList } from "./sales-invoice-list";

type SearchParams = Record<string, string | string[] | undefined>;

const header = (title: string) => (
  <VoucherToolbar
    title={title}
    back={{ href: SALES_INVOICES_PATH, label: config.title }}
  />
);

/** Locations, Sold By choices, Pay now accounts and what the user may change. */
async function loadFormProps() {
  const [locations, formData, canOverridePrice, canDiscount, canReadStock] =
    await Promise.all([
      getVisibleStockLocations(),
      // Pay now posts a receipt: same accounts and collectors as one.
      loadVoucherFormData({
        config: CASH_RECEIPT_CONFIG,
        getHeaderAccounts: CASH_RECEIPTS_MODULE.api.getHeaderAccounts,
      }),
      hasPermission(PERMISSIONS.SALES_OVERRIDE_PRICE),
      hasPermission(PERMISSIONS.SALES_DISCOUNT),
      hasPermission(PERMISSIONS.STOCK_READ),
    ]);
  if (!locations.ok) return locations;
  if (!formData.ok) return formData;
  const data = formData.data;
  return {
    ok: true as const,
    data: {
      today: uaeToday(),
      locations: locations.data,
      canAddCustomer: data.canAddParty,
      collectors: data.collectors,
      me: data.me,
      canSelectCollector: data.canSelectCollector,
      canOverridePrice,
      canDiscount,
      canReadStock,
      payAccounts: data.headerAccounts,
    },
  };
}

export async function SalesInvoiceListRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseSalesInvoiceFilters(searchParams);
  const scoped = await isOwnScope();
  const [page, access, locations, customerName, users] = await Promise.all([
    getSalesInvoices(filters),
    getVoucherAccess(config),
    getVisibleStockLocations(),
    getPartyName(filters.customerId),
    scoped ? null : getUsers(),
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={`${SALES_INVOICES_PATH}${toSalesInvoiceSearch(filters)}`}
        subject="sales invoices"
        header={<VoucherListHeading config={config} />}
      />
    );
  }
  return (
    <SalesInvoiceList
      page={page.data}
      filters={filters}
      access={access}
      locations={locations.ok ? locations.data : null}
      customerName={customerName}
      salesmen={users?.ok ? users.data : null}
    />
  );
}

export async function SalesInvoiceNewRoute() {
  const title = "New Sales Invoice";
  if (!(await getVoucherAccess(config)).canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }
  const props = await loadFormProps();
  if (!props.ok) {
    return (
      <LoadFailure
        failure={props}
        returnTo={`${SALES_INVOICES_PATH}/new`}
        subject="the sales invoice form"
        header={header(title)}
      />
    );
  }
  return <SalesInvoiceForm {...props.data} />;
}

export async function SalesInvoiceDetailRoute({
  id,
  searchParams,
}: {
  id: string;
  searchParams: SearchParams;
}) {
  const [detail, access, canPay, canAllocate] = await Promise.all([
    getSalesInvoice(id),
    getVoucherAccess(config),
    hasPermission(PERMISSIONS.CASH_RECEIPTS_CREATE),
    hasPermission(PERMISSIONS.ALLOCATIONS_MANAGE),
  ]);
  if (!detail.ok) {
    if (isMissing(detail)) notFound();
    return (
      <LoadFailure
        failure={detail}
        returnTo={salesInvoicePath(id)}
        subject="this sales invoice"
        header={header(config.singular)}
      />
    );
  }
  const { voucher } = detail.data;
  return (
    <VoucherView
      config={config}
      cancelAction={cancelSalesInvoice}
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
            supplierId={detail.data.customerId}
            balance={detail.data.balance}
            posted={voucher.status === "posted"}
            payHref={
              canPay
                ? `${NEW_CASH_RECEIPT_PATH}?${new URLSearchParams({ customer: detail.data.customerId, bill: id })}`
                : null
            }
            canAllocate={canAllocate}
            allocations={detail.data.allocations}
            targetType="sales-invoice"
          />
        </>
      }
    />
  );
}

export async function SalesInvoiceEditRoute({ id }: { id: string }) {
  const title = "Edit Sales Invoice";
  if (!(await getVoucherAccess(config)).canEdit) {
    return <ManageForbidden config={config} title={title} action="edit" />;
  }
  const [detail, props] = await Promise.all([
    getSalesInvoice(id),
    loadFormProps(),
  ]);
  for (const result of [detail, props]) {
    if (!result.ok) {
      if (isMissing(result)) notFound();
      return (
        <LoadFailure
          failure={result}
          returnTo={`${salesInvoicePath(id)}/edit`}
          subject="this sales invoice"
          header={header(title)}
        />
      );
    }
  }
  if (!detail.ok || !props.ok) return null;
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
    <SalesInvoiceForm
      {...props.data}
      existing={{
        id,
        voucherNo: data.voucher.voucherNo,
        date: data.voucher.voucherDate,
        customerId: data.customerId,
        customerName: data.customerName,
        locationId: data.locationId,
        soldBy: data.soldBy,
        dueDate: data.dueDate,
        remarks: data.voucher.comments,
        lines: data.lines,
      }}
    />
  );
}
