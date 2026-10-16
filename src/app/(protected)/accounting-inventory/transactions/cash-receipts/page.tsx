import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  countPostedCashReceipts,
  getCashAccounts,
  getCashReceipts,
  hasAnyCashReceipt,
} from "@/features/cash-receipts/api";
import {
  CASH_RECEIPTS_DESCRIPTION,
  CASH_RECEIPTS_PATH,
  CASH_RECEIPTS_TITLE,
} from "@/features/cash-receipts/constants";
import {
  parseFilters,
  resolveDateRange,
  toSearch,
} from "@/features/cash-receipts/filters";
import { CashReceiptsListPage } from "@/features/cash-receipts/list/cash-receipts-list-page";
import type { Loadable } from "@/features/cash-receipts/list/receipt-filter-bar";
import { LoadFailure } from "@/features/cash-receipts/load-failure";
import { getAccount } from "@/features/accounts/api";
import { getCashierLookup } from "@/features/cashiers/api";
import { getUsers } from "@/features/users/api";
import { canManageCashReceipts } from "@/features/cash-receipts/permissions";
import { describeFailure, type ApiResult } from "@/lib/api-types";
import { uaeToday } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Cash Receipts | ALA Dates",
};

/** A filter's lookup: failing it disables that one filter, not the page —
 * except a 401, which means the whole session is gone. */
function toLoadable<T>(result: ApiResult<T>, returnTo: string): Loadable<T> {
  if (result.ok) return result;
  if (result.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }
  return { ok: false, message: describeFailure(result) };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const returnTo = `${CASH_RECEIPTS_PATH}${toSearch(filters)}`;

  const [
    receipts,
    posted,
    cashAccounts,
    users,
    cashiers,
    selectedAccount,
    canManage,
  ] = await Promise.all([
    getCashReceipts(filters),
    // Posted-only and cancelled-only views already know the answer.
    filters.status === "all" ? countPostedCashReceipts(filters) : null,
    getCashAccounts(),
    getUsers(),
    getCashierLookup(false),
    filters.accountId ? getAccount(filters.accountId) : null,
    canManageCashReceipts(),
  ]);

  const header = (
    <div>
      <h1 className="font-heading text-2xl font-semibold">
        {CASH_RECEIPTS_TITLE}
      </h1>
      <p className="text-muted-foreground text-sm">
        {CASH_RECEIPTS_DESCRIPTION}
      </p>
    </div>
  );

  if (!receipts.ok) {
    return (
      <LoadFailure
        failure={receipts}
        returnTo={returnTo}
        subject="cash receipts"
        header={header}
      />
    );
  }
  if (posted && !posted.ok) {
    return (
      <LoadFailure
        failure={posted}
        returnTo={returnTo}
        subject="cash receipts"
        header={header}
      />
    );
  }

  const { summary, items } = receipts.data;

  // Past the last page (rows were cancelled away, or a stale link): go to it.
  const lastPage = Math.max(1, Math.ceil(summary.count / filters.pageSize));
  if (items.length === 0 && filters.page > lastPage) {
    redirect(
      `${CASH_RECEIPTS_PATH}${toSearch({ ...filters, page: lastPage })}`,
    );
  }

  let isFirstRun = false;
  if (summary.count === 0) {
    const any = await hasAnyCashReceipt();
    if (!any.ok) {
      return (
        <LoadFailure
          failure={any}
          returnTo={returnTo}
          subject="cash receipts"
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
    <CashReceiptsListPage
      page={receipts.data}
      filters={filters}
      dateRange={resolveDateRange(filters, uaeToday())}
      postedCount={postedCount}
      isFirstRun={isFirstRun}
      canManage={canManage}
      cashAccounts={toLoadable(cashAccounts, returnTo)}
      users={toLoadable(users, returnTo)}
      cashiers={toLoadable(cashiers, returnTo)}
      selectedAccountName={selectedAccountName}
    />
  );
}
