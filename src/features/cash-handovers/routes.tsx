import "server-only";

import { notFound, redirect } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { getCashInHandAccounts } from "@/features/accounts/api";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession } from "@/features/auth/session";
import { getCompanyProfile } from "@/features/company/api";
import { getCollectorLookup, getUsers } from "@/features/users/api";
import { getVoucherAccess } from "@/features/vouchers/access";
import { LoadFailure } from "@/features/vouchers/load-failure";
import { isMissing } from "@/features/vouchers/routes";
import { VoucherView } from "@/features/vouchers/view/voucher-view";
import { ManageForbidden } from "@/features/vouchers/voucher-states";
import { uaeToday } from "@/lib/datetime";

import { cancelCashHandover } from "./actions";
import { getHandover, getHandovers, getPendingCash } from "./api";
import {
  CASH_HANDOVER_CONFIG as config,
  CASH_HANDOVERS_PATH,
  cashHandoverPath,
} from "./constants";
import { parseHandoverFilters, toHandoverSearch } from "./filters";
import { HandoverForm } from "./handover-form";
import { HandoverItemsPanel } from "./handover-items-panel";
import { HandoverList } from "./handover-list";

type SearchParams = Record<string, string | string[] | undefined>;

const header = (title: string) => (
  <VoucherToolbar
    title={title}
    back={{ href: CASH_HANDOVERS_PATH, label: config.title }}
  />
);

export async function HandoverListRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseHandoverFilters(searchParams);
  const returnTo = `${CASH_HANDOVERS_PATH}${toHandoverSearch(filters)}`;
  const user = (await getServerSession())?.user;
  const scoped = user?.dataScope === "own";
  const [page, users, access] = await Promise.all([
    getHandovers(filters),
    scoped ? null : getUsers(),
    getVoucherAccess(config),
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={returnTo}
        subject="cash handovers"
        header={header(config.title)}
      />
    );
  }
  if (users && !users.ok && users.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }
  return (
    <HandoverList
      page={page.data}
      filters={filters}
      users={users?.ok ? users.data : null}
      canCreate={access.canCreate}
      canApprove={
        user?.permissions.includes(PERMISSIONS.CASH_HANDOVERS_APPROVE) ?? false
      }
      meId={user?.id ?? null}
    />
  );
}

export async function HandoverNewRoute({ userParam }: { userParam: string }) {
  const title = "Hand Over";
  if (!(await getVoucherAccess(config)).canCreate) {
    return <ManageForbidden config={config} title={title} action="create" />;
  }
  const failure = (result: Parameters<typeof LoadFailure>[0]["failure"]) => (
    <LoadFailure
      failure={result}
      returnTo={`${CASH_HANDOVERS_PATH}/new`}
      subject="the handover form"
      header={header(title)}
    />
  );

  const user = (await getServerSession())?.user;
  const canSelect =
    user?.permissions.includes(PERMISSIONS.VOUCHERS_SELECT_COLLECTOR) ?? false;

  // Without vouchers:select-collector it is always your own money.
  if (!canSelect) {
    const pending = await getPendingCash(null);
    if (!pending.ok) return failure(pending);
    return (
      <HandoverForm
        pending={pending.data}
        users={null}
        userId={null}
        today={uaeToday()}
      />
    );
  }

  const users = await getCollectorLookup(config.collectorFor);
  if (!users.ok) return failure(users);
  const known = (id: string | undefined) =>
    id && users.data.some((u) => u.id === id) ? id : null;
  const userId = known(userParam) ?? known(user?.id);
  const pending = userId ? await getPendingCash(userId) : null;
  if (pending && !pending.ok) return failure(pending);

  return (
    <HandoverForm
      // Fresh amounts for each user.
      key={userId ?? "none"}
      pending={pending?.data ?? null}
      users={users.data}
      userId={userId}
      today={uaeToday()}
    />
  );
}

export async function HandoverDetailRoute({
  id,
  searchParams,
}: {
  id: string;
  searchParams: SearchParams;
}) {
  const [handover, access, session] = await Promise.all([
    getHandover(id),
    getVoucherAccess(config),
    getServerSession(),
  ]);
  if (!handover.ok) {
    if (isMissing(handover)) notFound();
    return (
      <LoadFailure
        failure={handover}
        returnTo={cashHandoverPath(id)}
        subject="this handover"
        header={header(config.singular)}
      />
    );
  }
  const { voucher, workflow } = handover.data;
  const user = session?.user;
  const permissions = user?.permissions ?? [];
  const isOwn = workflow.userId !== null && workflow.userId === user?.id;
  // Nobody decides on a handover they submitted or that is their own money.
  const mayDecide =
    voucher.status === "submitted" &&
    !isOwn &&
    voucher.createdBy?.id !== user?.id &&
    permissions.includes(PERMISSIONS.CASH_HANDOVERS_APPROVE) &&
    user?.dataScope !== "own";

  const [accounts, company] = mayDecide
    ? await Promise.all([getCashInHandAccounts(), getCompanyProfile()])
    : [null, null];

  // Submitted: its submitter, or cash-handovers:cancel. Approved: :cancel only.
  const canCancel =
    permissions.includes(PERMISSIONS.CASH_HANDOVERS_CANCEL) ||
    (voucher.status === "submitted" && isOwn && access.canCreate);

  return (
    <VoucherView
      config={config}
      cancelAction={cancelCashHandover}
      voucher={voucher}
      access={{ ...access, canCreate: false, canEdit: false, canCancel }}
      justSaved={searchParams.saved === "1"}
      body={
        <HandoverItemsPanel
          id={voucher.id}
          voucherNo={voucher.voucherNo}
          workflow={workflow}
          approve={
            mayDecide && accounts?.ok
              ? {
                  accounts: accounts.data,
                  defaultCashInHandAccountId: company?.ok
                    ? company.data.defaultCashInHandAccountId
                    : null,
                  defaultChequesInHandAccountId: company?.ok
                    ? company.data.defaultChequesInHandAccountId
                    : null,
                }
              : null
          }
        />
      }
    />
  );
}
