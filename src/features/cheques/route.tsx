import "server-only";

import { redirect } from "next/navigation";

import { getAccount } from "@/features/accounts/api";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getServerSession } from "@/features/auth/session";
import { getUsers } from "@/features/users/api";
import { LoadFailure } from "@/features/vouchers/load-failure";
import { uaeToday } from "@/lib/datetime";

import { getCheques, getClearIntoAccounts, toChequeQuery } from "./api";
import { ChequesPage } from "./cheques-page";
import { CHEQUES_PATH } from "./constants";
import { parseChequeFilters, toChequeSearch } from "./filters";

type SearchParams = Record<string, string | string[] | undefined>;

const header = (
  <div>
    <h1 className="font-heading text-2xl font-semibold">Cheques</h1>
  </div>
);

export async function ChequesRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseChequeFilters(searchParams);
  const returnTo = `${CHEQUES_PATH}${toChequeSearch(filters)}`;
  const user = (await getServerSession())?.user;
  const permissions = user?.permissions ?? [];
  const access = {
    canDeposit: permissions.includes(PERMISSIONS.CHEQUES_DEPOSIT),
    canClear: permissions.includes(PERMISSIONS.CHEQUES_CLEAR),
    canReturn: permissions.includes(PERMISSIONS.CHEQUES_RETURN),
    canUndo: user?.role.name === "admin",
  };

  const [page, overall, users, accounts, customer] = await Promise.all([
    getCheques(toChequeQuery(filters)),
    // The strip sums every tab, under the same filters.
    getCheques(toChequeQuery(filters, { status: null, page: 1, pageSize: 1 })),
    user?.dataScope === "own" ? null : getUsers(),
    access.canDeposit || access.canClear ? getClearIntoAccounts() : null,
    filters.customerId ? getAccount(filters.customerId) : null,
  ]);
  if (!page.ok) {
    return (
      <LoadFailure
        failure={page}
        returnTo={returnTo}
        subject="cheques"
        header={header}
      />
    );
  }
  if (users && !users.ok && users.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }

  return (
    <ChequesPage
      page={page.data}
      summary={overall.ok ? overall.data.summary : page.data.summary}
      filters={filters}
      access={access}
      accounts={accounts?.ok ? accounts.data : null}
      users={
        users
          ? users.ok
            ? { ok: true, data: users.data }
            : { ok: false, message: "Couldn't load users." }
          : null
      }
      customerName={customer?.ok ? (customer.data?.name ?? null) : null}
      today={uaeToday()}
    />
  );
}
