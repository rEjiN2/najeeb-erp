import { ShieldX } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterLoadError } from "@/components/master/master-states";
import { StatePanel } from "@/components/master/state-panel";
import { isOwnScope } from "@/features/auth/session";
import {
  canViewSalesmanCollections,
  getSalesmanCollections,
} from "@/features/reports/salesman-collections/api";
import {
  SALESMAN_COLLECTIONS_DESCRIPTION,
  SALESMAN_COLLECTIONS_PATH,
  SALESMAN_COLLECTIONS_TITLE,
} from "@/features/reports/salesman-collections/constants";
import {
  parseReportFilters,
  toReportSearch,
} from "@/features/reports/salesman-collections/filters";
import { SalesmanCollectionsPage } from "@/features/reports/salesman-collections/report-page";
import { getUsers } from "@/features/users/api";
import type { ApiResult } from "@/lib/api";

export const metadata: Metadata = {
  title: "Salesman Collections | ALA Dates",
};

const header = (
  <div>
    <h1 className="font-heading text-2xl font-semibold">
      {SALESMAN_COLLECTIONS_TITLE}
    </h1>
    <p className="text-muted-foreground text-sm">
      {SALESMAN_COLLECTIONS_DESCRIPTION}
    </p>
  </div>
);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Hidden from the menu without reports:salesman; a direct link lands here.
  if (!(await canViewSalesmanCollections())) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel icon={ShieldX} title="You don't have permission">
          This report needs the &ldquo;reports:salesman&rdquo; permission. Ask
          an administrator for access.
        </StatePanel>
      </div>
    );
  }

  const filters = parseReportFilters(await searchParams);
  const returnTo = `${SALESMAN_COLLECTIONS_PATH}${toReportSearch(filters)}`;
  function toLogin(): never {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }

  const scoped = await isOwnScope();
  const [report, users] = await Promise.all([
    getSalesmanCollections(filters),
    // A scoped user sees only their own row: no filters to fill.
    scoped ? null : getUsers(),
  ]);

  if (!report.ok) {
    if (report.reason === "unauthorized") toLogin();
    return (
      <div className="space-y-6">
        {header}
        <MasterLoadError
          reason={report.reason}
          subject="the report"
          status={report.status}
          messages={report.messages}
        />
      </div>
    );
  }

  /** A filter's options: null (that filter disabled) when they failed. */
  function optional<T>(result: ApiResult<T> | null): T | null {
    if (!result) return null;
    if (result.ok) return result.data;
    if (result.reason === "unauthorized") toLogin();
    return null;
  }

  return (
    <SalesmanCollectionsPage
      report={report.data}
      filters={filters}
      scoped={scoped}
      users={optional(users)}
    />
  );
}
