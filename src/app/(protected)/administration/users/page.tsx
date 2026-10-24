import { ShieldX } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterLoadError } from "@/components/master/master-states";
import { StatePanel } from "@/components/master/state-panel";
import {
  canManageUsers,
  getAssignableCashAccounts,
  getRoleLookup,
  getUserPage,
  parseUserFilters,
} from "@/features/users/api";
import {
  USERS_DESCRIPTION,
  USERS_PATH,
  USERS_TITLE,
} from "@/features/users/constants";
import { getStockLocations } from "@/features/locations/api";
import { UsersPage } from "@/features/users/users-page";
import type { ApiFailure, ApiResult } from "@/lib/api";

export const metadata: Metadata = {
  title: "Users | ALA Dates",
};

function toLogin(): never {
  redirect(`/login?${new URLSearchParams({ from: USERS_PATH })}`);
}

const header = (
  <MasterPageHeader title={USERS_TITLE} description={USERS_DESCRIPTION} />
);

function LoadFailure({ failure }: { failure: ApiFailure }) {
  if (failure.reason === "unauthorized") toLogin();
  return (
    <div className="space-y-6">
      {header}
      <MasterLoadError
        reason={failure.reason}
        subject="users"
        status={failure.status}
        messages={failure.messages}
      />
    </div>
  );
}

/** A picker's data: null when it failed (the form says so), except a 401. */
function optional<T>(result: ApiResult<T>): T | null {
  if (result.ok) return result.data;
  if (result.reason === "unauthorized") toLogin();
  return null;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Hidden from the menu without users:manage; a direct link lands here.
  if (!(await canManageUsers())) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel icon={ShieldX} title="You don't have permission">
          Managing users needs the &ldquo;Manage users&rdquo; permission. Ask an
          administrator for access.
        </StatePanel>
      </div>
    );
  }

  const filters = parseUserFilters(await searchParams);
  const [users, roles, cashAccounts, stockLocations] = await Promise.all([
    getUserPage(filters),
    getRoleLookup(),
    getAssignableCashAccounts(),
    getStockLocations(),
  ]);

  if (!users.ok) return <LoadFailure failure={users} />;

  return (
    <UsersPage
      page={users.data}
      filters={filters}
      roles={optional(roles)}
      cashAccounts={optional(cashAccounts)}
      stockLocations={optional(stockLocations)}
    />
  );
}
