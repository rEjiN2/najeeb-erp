import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterLoadError } from "@/components/master/master-states";
import {
  canManageCashiers,
  getCashiers,
  parseCashierFilters,
} from "@/features/cashiers/api";
import { CashiersPage } from "@/features/cashiers/cashiers-page";
import {
  CASHIERS_DESCRIPTION,
  CASHIERS_PATH,
  CASHIERS_TITLE,
} from "@/features/cashiers/constants";
import { getLocations } from "@/features/locations/api";
import { getUsers } from "@/features/users/api";
import type { ApiFailure } from "@/lib/api";

export const metadata: Metadata = {
  title: "Cashiers | ALA Dates",
};

function toLogin(): never {
  redirect(`/login?${new URLSearchParams({ from: CASHIERS_PATH })}`);
}

function LoadFailure({ failure }: { failure: ApiFailure }) {
  if (failure.reason === "unauthorized") toLogin();
  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={CASHIERS_TITLE}
        description={CASHIERS_DESCRIPTION}
      />
      <MasterLoadError
        reason={failure.reason}
        subject="cashiers"
        status={failure.status}
        messages={failure.messages}
      />
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseCashierFilters(await searchParams);

  // Users and locations name two columns and feed the form's pickers; if
  // either fails, those spots say so instead of the whole screen failing.
  const [cashiers, users, locations, canManage] = await Promise.all([
    getCashiers(filters),
    getUsers(),
    getLocations(),
    canManageCashiers(),
  ]);

  if (!cashiers.ok) return <LoadFailure failure={cashiers} />;
  if (
    (!users.ok && users.reason === "unauthorized") ||
    (!locations.ok && locations.reason === "unauthorized")
  ) {
    toLogin();
  }

  return (
    <CashiersPage
      page={cashiers.data}
      filters={filters}
      canManage={canManage}
      users={users.ok ? users.data : null}
      locations={locations.ok ? locations.data : null}
    />
  );
}
