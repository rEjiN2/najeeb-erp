import type { Metadata } from "next";

import { ACCOUNTING_REPORTS } from "@/features/reports/accounting/constants";
import { AccountingReportRoute } from "@/features/reports/accounting/report-route";

export const metadata: Metadata = {
  title: `${ACCOUNTING_REPORTS["trial-balance"].title} | ALA Dates`,
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AccountingReportRoute
      reportKey="trial-balance"
      searchParams={searchParams}
    />
  );
}
