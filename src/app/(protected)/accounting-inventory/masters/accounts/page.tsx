import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterLoadError } from "@/components/master/master-states";
import {
  getAccounts,
  getExpenseAccounts,
  parseAccountFilters,
} from "@/features/accounts/api";
import { AccountsPage } from "@/features/accounts/accounts-page";
import {
  ACCOUNTS_DESCRIPTION,
  ACCOUNTS_PATH,
  ACCOUNTS_TITLE,
} from "@/features/accounts/constants";
import { getLocations } from "@/features/locations/api";
import type { ApiFailure } from "@/lib/api";

export const metadata: Metadata = {
  title: "Accounts | ALA Dates",
};

function LoadFailure({ failure }: { failure: ApiFailure }) {
  if (failure.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: ACCOUNTS_PATH })}`);
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={ACCOUNTS_TITLE}
        description={ACCOUNTS_DESCRIPTION}
      />
      <MasterLoadError
        reason={failure.reason}
        subject="accounts"
        status={failure.status}
      />
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAccountFilters(await searchParams);

  // Locations name the "Linked Location" column, so they're required. The
  // expense accounts only feed the bank-charge picker: if they fail, the
  // form says so in that one spot instead of the whole screen failing.
  const [accounts, locations, expenseAccounts] = await Promise.all([
    getAccounts(filters),
    getLocations(),
    getExpenseAccounts(),
  ]);

  if (!accounts.ok) return <LoadFailure failure={accounts} />;
  if (!locations.ok) return <LoadFailure failure={locations} />;
  if (!expenseAccounts.ok && expenseAccounts.reason === "unauthorized") {
    return <LoadFailure failure={expenseAccounts} />;
  }

  return (
    <AccountsPage
      page={accounts.data}
      filters={filters}
      locations={locations.data}
      expenseAccounts={expenseAccounts.ok ? expenseAccounts.data : null}
    />
  );
}
