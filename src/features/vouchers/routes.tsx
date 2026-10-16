import "server-only";

import { notFound, redirect } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { getAccount } from "@/features/accounts/api";
import { getCashierLookup } from "@/features/cashiers/api";
import { getUsers } from "@/features/users/api";
import { describeFailure, type ApiResult } from "@/lib/api-types";
import { uaeToday } from "@/lib/datetime";

import type { createVoucherApi } from "./api";
import {
  editVoucherPath,
  newVoucherPath,
  voucherPath,
  type VoucherConfig,
} from "./config";
import { parseFilters, resolveDateRange, toSearch } from "./filters";
import { loadVoucherFormData } from "./form-data";
import { VoucherForm } from "./form/voucher-form";
import { VoucherListPage } from "./list/voucher-list-page";
import type { Loadable } from "./list/voucher-filter-bar";
import { LoadFailure } from "./load-failure";
import type {
  CancelVoucherAction,
  CreateVoucherAction,
  UpdateVoucherAction,
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
  /** Whether the signed-in user holds the voucher's manage permission. */
  canManage: () => Promise<boolean>;
  createAction: CreateVoucherAction;
  updateAction: UpdateVoucherAction;
  cancelAction: CancelVoucherAction;
}

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
  module: { config, api, canManage: canManageFn, cancelAction },
  searchParams,
}: {
  module: VoucherModule;
  searchParams: SearchParams;
}) {
  const filters = parseFilters(searchParams);
  const returnTo = `${config.basePath}${toSearch(filters)}`;

  const [
    vouchers,
    posted,
    headerAccounts,
    users,
    cashiers,
    selectedAccount,
    canManage,
  ] = await Promise.all([
    api.getVouchers(filters),
    // Posted-only and cancelled-only views already know the answer.
    filters.status === "all" ? api.countPosted(filters) : null,
    api.getHeaderAccounts(),
    getUsers(),
    getCashierLookup(false),
    filters.accountId ? getAccount(filters.accountId) : null,
    canManageFn(),
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
  if (posted && !posted.ok) {
    return (
      <LoadFailure
        failure={posted}
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

  const postedCount = posted
    ? posted.data
    : filters.status === "posted"
      ? summary.count
      : 0;

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
      canManage={canManage}
      headerAccounts={toLoadable(headerAccounts, returnTo)}
      users={toLoadable(users, returnTo)}
      cashiers={toLoadable(cashiers, returnTo)}
      selectedAccountName={selectedAccountName}
    />
  );
}

export async function VoucherNewRoute({ module }: { module: VoucherModule }) {
  const { config, api } = module;
  const title = `New ${config.singular}`;

  if (!(await module.canManage())) {
    return <ManageForbidden config={config} title={title} />;
  }

  const formData = await loadVoucherFormData({
    preselectMine: true,
    getHeaderAccounts: api.getHeaderAccounts,
  });
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
      createAction={module.createAction}
      updateAction={module.updateAction}
      {...formData.data}
    />
  );
}

/** 400 is a malformed id — as far as the user can tell, no such voucher. */
function isMissing(result: ApiResult<unknown>): boolean {
  return (
    !result.ok &&
    result.reason === "error" &&
    (result.status === 404 || result.status === 400)
  );
}

export async function VoucherDetailRoute({
  module: { config, api, canManage: canManageFn, cancelAction },
  id,
  searchParams,
}: {
  module: VoucherModule;
  id: string;
  searchParams: SearchParams;
}) {
  const [voucher, canManage] = await Promise.all([
    api.getVoucher(id),
    canManageFn(),
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
      canManage={canManage}
      justSaved={searchParams.saved === "1"}
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

  if (!(await module.canManage())) {
    return <ManageForbidden config={config} title={title} />;
  }

  const [voucher, formData] = await Promise.all([
    api.getVoucher(id),
    loadVoucherFormData({
      preselectMine: false,
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
      createAction={module.createAction}
      updateAction={module.updateAction}
      voucher={voucher.data}
      {...formData.data}
    />
  );
}
