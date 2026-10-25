import "server-only";

import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { getAccount } from "@/features/accounts/api";
import { isOwnScope } from "@/features/auth/session";
import { getUsers } from "@/features/users/api";
import { apiGet } from "@/lib/api";
import { describeFailure, type ApiResult } from "@/lib/api-types";
import { uaeToday } from "@/lib/datetime";

import { getVoucherAccess } from "./access";
import type { createVoucherApi } from "./api";
import {
  editVoucherPath,
  newVoucherPath,
  voucherPath,
  type VoucherConfig,
} from "./config";
import { parseFilters, resolveDateRange, toSearch } from "./filters";
import { loadVoucherFormData } from "./form-data";
import type { OpenBill } from "./allocation-dialog";
import type { DraftLine } from "./form/draft";
import { VoucherForm } from "./form/voucher-form";
import { VoucherListPage } from "./list/voucher-list-page";
import type { Loadable } from "./list/voucher-filter-bar";
import { LoadFailure } from "./load-failure";
import type {
  CancelVoucherAction,
  CreateVoucherAction,
  UpdateVoucherAction,
  VoucherDetail,
} from "./types";
import { VoucherView } from "./view/voucher-view";
import {
  CancelledNotEditable,
  ManageForbidden,
  VoucherListHeading,
} from "./voucher-states";

/** Everything a voucher type's routes need: its screens, reads and writes. */
export interface VoucherModule {
  config: VoucherConfig;
  api: ReturnType<typeof createVoucherApi>;
  createAction: CreateVoucherAction;
  updateAction: UpdateVoucherAction;
  cancelAction: CancelVoucherAction;
}

/** What the list and view pages need — voucher types with their own form
 * (handovers) supply only this. */
export type VoucherReadModule = Pick<
  VoucherModule,
  "config" | "api" | "cancelAction"
> & {
  /** Shown under the list heading, e.g. a salesman's unsettled cash. */
  listBanner?: () => Promise<ReactNode>;
  /** Replaces the view page's lines and totals (handovers). */
  detailBody?: (voucher: VoucherDetail) => Promise<ReactNode>;
};

type SearchParams = Record<string, string | string[] | undefined>;

/** A filter's lookup: failing it disables that one filter, not the page —
 * except a 401, which means the whole session is gone. */
function toLoadable<T>(result: ApiResult<T>, returnTo: string): Loadable<T> {
  if (result.ok) return result;
  if (result.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }
  return { ok: false, message: describeFailure(result) };
}

function backToList(config: VoucherConfig) {
  return { href: config.basePath, label: config.title };
}

export async function VoucherListRoute({
  module: { config, api, cancelAction, listBanner },
  searchParams,
}: {
  module: VoucherReadModule;
  searchParams: SearchParams;
}) {
  const filters = parseFilters(searchParams, config.statusFilters);
  const returnTo = `${config.basePath}${toSearch(filters)}`;
  // An "own"-scoped user sees only their own vouchers: no collected-by or
  // created-by filters to pick other people from.
  const scoped = await isOwnScope();

  const [
    vouchers,
    cancelled,
    headerAccounts,
    users,
    selectedAccount,
    access,
    banner,
  ] = await Promise.all([
    api.getVouchers(filters),
    // Single-status views already know the answer.
    filters.status === "all" ? api.countCancelled(filters) : null,
    api.getHeaderAccounts(),
    scoped ? null : getUsers(),
    filters.accountId ? getAccount(filters.accountId) : null,
    getVoucherAccess(config),
    listBanner?.() ?? null,
  ]);

  const header = <VoucherListHeading config={config} />;
  const subject = config.title.toLowerCase();

  if (!vouchers.ok) {
    return (
      <LoadFailure
        failure={vouchers}
        returnTo={returnTo}
        subject={subject}
        header={header}
      />
    );
  }
  if (cancelled && !cancelled.ok) {
    return (
      <LoadFailure
        failure={cancelled}
        returnTo={returnTo}
        subject={subject}
        header={header}
      />
    );
  }

  const { summary, items } = vouchers.data;

  // Past the last page (rows were cancelled away, or a stale link): go to it.
  const lastPage = Math.max(1, Math.ceil(summary.count / filters.pageSize));
  if (items.length === 0 && filters.page > lastPage) {
    redirect(`${config.basePath}${toSearch({ ...filters, page: lastPage })}`);
  }

  let isFirstRun = false;
  if (summary.count === 0) {
    const any = await api.hasAny();
    if (!any.ok) {
      return (
        <LoadFailure
          failure={any}
          returnTo={returnTo}
          subject={subject}
          header={header}
        />
      );
    }
    isFirstRun = !any.data;
  }

  // Everything but cancelled ones: what the summary total counts.
  const postedCount = cancelled
    ? summary.count - cancelled.data
    : filters.status === "cancelled"
      ? 0
      : summary.count;

  let selectedAccountName: string | null = null;
  if (selectedAccount) {
    const account = toLoadable(selectedAccount, returnTo);
    selectedAccountName = account.ok ? (account.data?.name ?? null) : null;
  }

  return (
    <VoucherListPage
      config={config}
      cancelAction={cancelAction}
      page={vouchers.data}
      filters={filters}
      dateRange={resolveDateRange(filters, uaeToday())}
      postedCount={postedCount}
      isFirstRun={isFirstRun}
      access={access}
      headerAccounts={toLoadable(headerAccounts, returnTo)}
      users={users ? toLoadable(users, returnTo) : null}
      selectedAccountName={selectedAccountName}
      banner={banner}
    />
  );
}

/**
 * A payment line for one bill (?supplier=&bill=, or a receipt's
 * ?customer=&bill=): the party's account, amount = the bill's balance,
 * allocated to it. Anything off returns none.
 */
async function billPaymentLine(
  searchParams: SearchParams,
): Promise<DraftLine | null> {
  const partyId = searchParams.supplier ?? searchParams.customer;
  const billId = searchParams.bill;
  if (typeof partyId !== "string" || typeof billId !== "string") return null;
  if (!/^[a-f\d]{24}$/i.test(partyId) || !/^[a-f\d]{24}$/i.test(billId)) {
    return null;
  }
  const [party, bills] = await Promise.all([
    apiGet<{ name: string; ledgerAccountId: string }>(`/parties/${partyId}`),
    apiGet<OpenBill[]>(`/parties/${partyId}/open-bills`),
  ]);
  const bill = bills.ok ? bills.data.find((b) => b.id === billId) : undefined;
  if (!party.ok || !bill) return null;
  return {
    id: `bill-${bill.id}`,
    accountId: party.data.ledgerAccountId,
    accountName: party.data.name,
    narration: `Payment for ${bill.number}${bill.billNo ? ` (bill ${bill.billNo})` : ""}`,
    remarks: "",
    oldBalance: null,
    amount: bill.balance.toFixed(2),
    vat: "",
    accountType: searchParams.customer ? "party" : "supplier",
    allocations: [
      {
        targetType: bill.type,
        targetId: bill.id,
        number: bill.number,
        billNo: bill.billNo,
        amount: bill.balance,
        saved: 0,
      },
    ],
  };
}

export async function VoucherNewRoute({
  module,
  searchParams = {},
}: {
  module: VoucherModule;
  searchParams?: SearchParams;
}) {
  const { config, api } = module;
  const title = `New ${config.singular}`;

  const access = await getVoucherAccess(config);
  if (!access.canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }

  const [formData, billLine] = await Promise.all([
    loadVoucherFormData({
      config,
      getHeaderAccounts: api.getHeaderAccounts,
    }),
    config.allocatesBills ? billPaymentLine(searchParams) : null,
  ]);
  if (!formData.ok) {
    return (
      <LoadFailure
        failure={formData}
        returnTo={newVoucherPath(config)}
        subject={`the ${config.noun} form`}
        header={<VoucherToolbar title={title} back={backToList(config)} />}
      />
    );
  }

  return (
    <VoucherForm
      mode="create"
      config={config}
      showBalances={access.canViewBalances}
      createAction={module.createAction}
      updateAction={module.updateAction}
      initialLines={billLine ? [billLine] : undefined}
      {...formData.data}
    />
  );
}

/** 400 is a malformed id — as far as the user can tell, no such voucher. */
export function isMissing(result: ApiResult<unknown>): boolean {
  return (
    !result.ok &&
    result.reason === "error" &&
    (result.status === 404 || result.status === 400)
  );
}

export async function VoucherDetailRoute({
  module: { config, api, cancelAction, detailBody },
  id,
  searchParams,
}: {
  module: VoucherReadModule;
  id: string;
  searchParams: SearchParams;
}) {
  const [voucher, access] = await Promise.all([
    api.getVoucher(id),
    getVoucherAccess(config),
  ]);

  if (!voucher.ok) {
    if (isMissing(voucher)) notFound();
    return (
      <LoadFailure
        failure={voucher}
        returnTo={voucherPath(config, id)}
        subject={`this ${config.singular.toLowerCase()}`}
        header={
          <VoucherToolbar title={config.singular} back={backToList(config)} />
        }
      />
    );
  }

  return (
    <VoucherView
      config={config}
      cancelAction={cancelAction}
      voucher={voucher.data}
      access={access}
      justSaved={searchParams.saved === "1"}
      body={detailBody ? await detailBody(voucher.data) : undefined}
    />
  );
}

export async function VoucherEditRoute({
  module,
  id,
}: {
  module: VoucherModule;
  id: string;
}) {
  const { config, api } = module;
  const title = `Edit ${config.singular}`;
  const returnTo = editVoucherPath(config, id);

  const access = await getVoucherAccess(config);
  if (!access.canEdit) {
    return <ManageForbidden config={config} title={title} action="edit" />;
  }

  const [voucher, formData] = await Promise.all([
    api.getVoucher(id),
    loadVoucherFormData({
      config,
      getHeaderAccounts: api.getHeaderAccounts,
    }),
  ]);

  const header = <VoucherToolbar title={title} back={backToList(config)} />;

  if (!voucher.ok) {
    if (isMissing(voucher)) notFound();
    return (
      <LoadFailure
        failure={voucher}
        returnTo={returnTo}
        subject={`this ${config.singular.toLowerCase()}`}
        header={header}
      />
    );
  }
  if (voucher.data.status === "cancelled") {
    return (
      <CancelledNotEditable
        config={config}
        id={id}
        voucherNo={voucher.data.voucherNo}
      />
    );
  }
  if (!formData.ok) {
    return (
      <LoadFailure
        failure={formData}
        returnTo={returnTo}
        subject={`the ${config.noun} form`}
        header={header}
      />
    );
  }

  return (
    <VoucherForm
      mode="edit"
      config={config}
      showBalances={access.canViewBalances}
      createAction={module.createAction}
      updateAction={module.updateAction}
      voucher={voucher.data}
      {...formData.data}
    />
  );
}
