import "server-only";

import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { getAccount } from "@/features/accounts/api";
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

import { cancelOpeningBalance } from "./actions";
import { getOpeningBalance, getOpeningBalances } from "./api";
import {
  OPENING_BALANCE_CONFIG as config,
  OPENING_BALANCES_PATH,
  openingBalancePath,
} from "./constants";
import { parseOpeningBalanceFilters, toOpeningBalanceSearch } from "./filters";
import { OpeningBalanceForm } from "./opening-balance-form";
import { OpeningBalanceLines } from "./opening-balance-lines";
import { OpeningBalanceList } from "./opening-balance-list";

type SearchParams = Record<string, string | string[] | undefined>;

const header = (title: string) => (
  <VoucherToolbar
    title={title}
    back={{ href: OPENING_BALANCES_PATH, label: config.title }}
  />
);

export async function OpeningBalanceListRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseOpeningBalanceFilters(searchParams);
  const [page, access, account] = await Promise.all([
    getOpeningBalances(filters),
    getVoucherAccess(config),
    filters.accountId ? getAccount(filters.accountId) : null,
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={`${OPENING_BALANCES_PATH}${toOpeningBalanceSearch(filters)}`}
        subject="opening balances"
        header={<VoucherListHeading config={config} />}
      />
    );
  }
  return (
    <OpeningBalanceList
      page={page.data}
      filters={filters}
      access={access}
      accountName={account?.ok ? (account.data?.name ?? null) : null}
    />
  );
}

export async function OpeningBalanceNewRoute() {
  if (!(await getVoucherAccess(config)).canCreate) {
    return (
      <ManageForbidden
        config={config}
        title="New Opening Balance"
        action="create"
      />
    );
  }
  return <OpeningBalanceForm today={uaeToday()} />;
}

export async function OpeningBalanceDetailRoute({
  id,
  searchParams,
}: {
  id: string;
  searchParams: SearchParams;
}) {
  const [detail, access] = await Promise.all([
    getOpeningBalance(id),
    getVoucherAccess(config),
  ]);
  if (!detail.ok) {
    if (isMissing(detail)) notFound();
    return (
      <LoadFailure
        failure={detail}
        returnTo={openingBalancePath(id)}
        subject="this opening balance"
        header={header(config.singular)}
      />
    );
  }
  return (
    <VoucherView
      config={config}
      cancelAction={cancelOpeningBalance}
      voucher={detail.data.voucher}
      access={access}
      justSaved={searchParams.saved === "1"}
      body={<OpeningBalanceLines detail={detail.data} />}
    />
  );
}

export async function OpeningBalanceEditRoute({ id }: { id: string }) {
  const title = "Edit Opening Balance";
  if (!(await getVoucherAccess(config)).canEdit) {
    return <ManageForbidden config={config} title={title} action="edit" />;
  }
  const detail = await getOpeningBalance(id);
  if (!detail.ok) {
    if (isMissing(detail)) notFound();
    return (
      <LoadFailure
        failure={detail}
        returnTo={`${openingBalancePath(id)}/edit`}
        subject="this opening balance"
        header={header(title)}
      />
    );
  }
  const { voucher, lines } = detail.data;
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
    <OpeningBalanceForm
      today={uaeToday()}
      existing={{
        id,
        voucherNo: voucher.voucherNo,
        asOfDate: voucher.voucherDate,
        comments: voucher.comments,
        lines,
      }}
    />
  );
}
