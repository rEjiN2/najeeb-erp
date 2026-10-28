import { ShieldX } from "lucide-react";
import { redirect } from "next/navigation";

import { MasterLoadError } from "@/components/master/master-states";
import { StatePanel } from "@/components/master/state-panel";
import { getAccount } from "@/features/accounts/api";
import { uaeToday } from "@/lib/datetime";

import {
  canViewAccountingReports,
  findAccountIdByCode,
  getAccountingReport,
} from "./api";
import { ACCOUNTING_REPORTS, type AccountingReportKey } from "./constants";
import {
  parseReportFilters,
  reportBackendQuery,
  toReportSearch,
} from "./filters";
import {
  CashBookReportPage,
  DayBookReportPage,
  LedgerReportPage,
  TrialBalanceReportPage,
} from "./report-pages";
import type {
  CashBookReport,
  DayBookReport,
  LedgerReport,
  TrialBalanceReport,
} from "./types";

/** One accounting report page: permission, filters from the URL, fetch, states. */
export async function AccountingReportRoute({
  reportKey,
  searchParams,
}: {
  reportKey: AccountingReportKey;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const meta = ACCOUNTING_REPORTS[reportKey];
  const header = (
    <div>
      <h1 className="font-heading text-2xl font-semibold">{meta.title}</h1>
      <p className="text-muted-foreground text-sm">{meta.description}</p>
    </div>
  );

  // Hidden from the menu without reports:accounting; a direct link lands here.
  if (!(await canViewAccountingReports())) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel icon={ShieldX} title="You don't have permission">
          This report needs the &ldquo;reports:accounting&rdquo; permission. Ask
          an administrator for access.
        </StatePanel>
      </div>
    );
  }

  let filters = parseReportFilters(await searchParams, meta.defaultRange);
  const returnTo = `${meta.path}${toReportSearch(filters, meta.defaultRange)}`;
  function toLogin(): never {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }

  // Trial Balance drill-down arrives with an account code.
  if (filters.code && !filters.accountId) {
    const accountId = await findAccountIdByCode(filters.code);
    filters = { ...filters, accountId: accountId ?? "", code: "" };
    if (accountId) {
      redirect(`${meta.path}${toReportSearch(filters, meta.defaultRange)}`);
    }
  }

  const needsAccount = reportKey === "ledger" && !filters.accountId;
  const [report, account] = await Promise.all([
    needsAccount ? null : getAccountingReport<unknown>(reportKey, filters),
    filters.accountId ? getAccount(filters.accountId) : null,
  ]);

  if (report && !report.ok) {
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
  if (account && !account.ok && account.reason === "unauthorized") toLogin();

  const accountName = account?.ok ? (account.data?.name ?? null) : null;
  // The backend ignores page when it exports the whole report.
  const exportQuery = reportBackendQuery(
    reportKey,
    filters,
    uaeToday(),
  ).toString();
  const common = { filters, accountName, exportQuery };
  const data = report?.ok ? report.data : null;

  switch (reportKey) {
    case "ledger":
      return (
        <LedgerReportPage report={data as LedgerReport | null} {...common} />
      );
    case "day-book":
      return <DayBookReportPage report={data as DayBookReport} {...common} />;
    case "cash-book":
      return <CashBookReportPage report={data as CashBookReport} {...common} />;
    case "trial-balance":
      return (
        <TrialBalanceReportPage
          report={data as TrialBalanceReport}
          {...common}
        />
      );
  }
}

export function ReportLoading({
  reportKey,
}: {
  reportKey: AccountingReportKey;
}) {
  const meta = ACCOUNTING_REPORTS[reportKey];
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{meta.title}</h1>
        <p className="text-muted-foreground text-sm">{meta.description}</p>
      </div>
      <div className="bg-muted h-16 animate-pulse rounded-lg" />
      <div className="bg-muted h-64 animate-pulse rounded-lg" />
    </div>
  );
}
