"use client";

import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { StatePanel } from "@/components/master/state-panel";
import { Badge } from "@/components/ui/badge";
import { ACCOUNT_TYPE_BADGES } from "@/features/vouchers/constants";
import { formatCalendarDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import { ACCOUNTING_REPORTS, VOUCHER_TYPE_LABELS } from "./constants";
import type { ReportFilters } from "./filters";
import {
  Money,
  ReportShell,
  ReportTable,
  VoucherLink,
  REPORT_PAGE_SIZE,
  stickyHead,
} from "./report-shell";
import type {
  CashBookReport,
  DayBookReport,
  LedgerReport,
  TrialBalanceReport,
} from "./types";

interface PageProps<T> {
  report: T;
  filters: ReportFilters;
  accountName: string | null;
  exportQuery: string;
}

const th = (extra?: string) => cn(stickyHead, "h-10 px-3 text-left font-medium", extra);
const td = (extra?: string) => cn("px-3 py-2 align-top", extra);
const num = "text-right whitespace-nowrap";
const typeLabel = (type: string) => VOUCHER_TYPE_LABELS[type] ?? type;

function Empty({ title, children }: { title: string; children: string }) {
  return (
    <StatePanel icon={BookOpen} title={title}>
      {children}
    </StatePanel>
  );
}

export function LedgerReportPage({
  report,
  ...rest
}: PageProps<LedgerReport | null>) {
  return (
    <ReportShell
      reportKey="ledger"
      {...rest}
      exportDisabled={!report}
      total={report?.total}
    >
      {!report ? (
        <Empty title="Pick an account">
          Choose a customer, supplier or any account to see its statement.
        </Empty>
      ) : (
        <LedgerTable report={report} page={rest.filters.page} />
      )}
    </ReportShell>
  );
}

function LedgerTable({ report, page }: { report: LedgerReport; page: number }) {
  const lastPage = page >= Math.max(1, Math.ceil(report.total / REPORT_PAGE_SIZE));
  return (
    <>
      <p className="text-sm">
        <span className="font-medium">{report.account.name}</span>{" "}
        <span className="text-muted-foreground font-mono">
          {report.account.code}
        </span>
      </p>
      <ReportTable>
        <thead>
          <tr>
            <th className={th()}>Date</th>
            <th className={th()}>Type</th>
            <th className={th()}>No</th>
            <th className={th()}>Narration</th>
            <th className={th(num)}>Debit</th>
            <th className={th(num)}>Credit</th>
            <th className={th(num)}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {page === 1 ? (
            <tr className="bg-muted/40 border-b">
              <td className={td("font-medium")} colSpan={6}>
                Opening balance
              </td>
              <td className={td(num)}>
                <Money value={report.opening} strong />
              </td>
            </tr>
          ) : null}
          {report.rows.map((row, index) => (
            <tr
              key={`${row.voucherId}-${index}`}
              className={cn(
                "border-b",
                (row.cancelled || row.reversal) && "text-muted-foreground",
              )}
            >
              <td className={td("whitespace-nowrap")}>
                {formatCalendarDate(row.date)}
              </td>
              <td className={td()}>{typeLabel(row.voucherType)}</td>
              <td className={td()}>
                <VoucherLink
                  type={row.voucherType}
                  id={row.voucherId}
                  no={row.voucherNo}
                />
                {row.cancelled ? (
                  <Badge variant="outline" className="ml-2 font-normal">
                    {row.reversal ? "Reversal" : "Cancelled"}
                  </Badge>
                ) : null}
              </td>
              <td className={td()}>{row.narration ?? ""}</td>
              <td className={td(num)}>
                {row.debit ? <Money value={row.debit} /> : null}
              </td>
              <td className={td(num)}>
                {row.credit ? <Money value={row.credit} /> : null}
              </td>
              <td className={td(num)}>
                <Money value={row.runningBalance} />
              </td>
            </tr>
          ))}
          {report.rows.length === 0 ? (
            <tr>
              <td className={td("text-muted-foreground text-center")} colSpan={7}>
                No entries in this period.
              </td>
            </tr>
          ) : null}
        </tbody>
        {lastPage ? (
          <tfoot>
            <tr className="bg-muted/40 border-t font-medium">
              <td className={td()} colSpan={4}>
                Total / Closing balance
              </td>
              <td className={td(num)}>
                <Money value={report.totals.debit} strong />
              </td>
              <td className={td(num)}>
                <Money value={report.totals.credit} strong />
              </td>
              <td className={td(num)}>
                <Money value={report.closing} strong />
              </td>
            </tr>
          </tfoot>
        ) : null}
      </ReportTable>
    </>
  );
}

export function DayBookReportPage({ report, ...rest }: PageProps<DayBookReport>) {
  return (
    <ReportShell reportKey="day-book" {...rest} total={report.total}>
      {report.rows.length === 0 ? (
        <Empty title="No vouchers">Nothing was posted in this period.</Empty>
      ) : (
        <>
          <ReportTable>
            <thead>
              <tr>
                <th className={th()}>Date</th>
                <th className={th()}>Type</th>
                <th className={th()}>No</th>
                <th className={th()}>Party / Accounts</th>
                <th className={th(num)}>Amount</th>
                <th className={th()}>Status</th>
                <th className={th()}>Created By</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr
                  key={row.voucherId}
                  className={cn(
                    "border-b",
                    row.status === "cancelled" && "text-muted-foreground",
                  )}
                >
                  <td className={td("whitespace-nowrap")}>
                    {formatCalendarDate(row.date)}
                  </td>
                  <td className={td()}>{typeLabel(row.type)}</td>
                  <td className={td()}>
                    <VoucherLink type={row.type} id={row.voucherId} no={row.no} />
                  </td>
                  <td className={td()}>{row.summary}</td>
                  <td className={td(num)}>
                    <Money value={row.amount} />
                  </td>
                  <td className={td()}>
                    <Badge variant="outline" className="font-normal capitalize">
                      {row.status}
                    </Badge>
                  </td>
                  <td className={td()}>{row.createdBy?.name ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
          <div className="bg-card rounded-lg border p-3 text-sm">
            <p className="mb-2 font-medium">Totals by type (whole period)</p>
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {report.totals.map((total) => (
                <div key={total.type} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {typeLabel(total.type)} ({total.count})
                  </dt>
                  <dd>
                    <Money value={total.amount} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}
    </ReportShell>
  );
}

export function CashBookReportPage({ report, ...rest }: PageProps<CashBookReport>) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (date: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(date)) next.add(date);
      return next;
    });
  const receipts = report.daily.reduce((sum, day) => sum + day.receipts, 0);
  const payments = report.daily.reduce((sum, day) => sum + day.payments, 0);

  return (
    <ReportShell reportKey="cash-book" {...rest}>
      <p className="text-muted-foreground text-sm">
        {report.accounts.length === 1
          ? report.accounts[0]?.name
          : `${report.accounts.length} cash and bank accounts`}
      </p>
      <ReportTable>
        <thead>
          <tr>
            <th className={th()}>Date</th>
            <th className={th(num)}>Opening</th>
            <th className={th(num)}>Receipts</th>
            <th className={th(num)}>Payments</th>
            <th className={th(num)}>Closing</th>
          </tr>
        </thead>
        <tbody>
          {report.daily.map((day) => {
            const isOpen = open.has(day.date);
            const entries = report.details.filter((d) => d.date === day.date);
            return (
              <Fragment key={day.date}>
                <tr
                  className="cursor-pointer border-b"
                  onClick={() => toggle(day.date)}
                >
                  <td className={td("whitespace-nowrap")}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className="flex items-center gap-1"
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                      {formatCalendarDate(day.date)}
                    </button>
                  </td>
                  <td className={td(num)}>
                    <Money value={day.opening} />
                  </td>
                  <td className={td(num)}>
                    <Money value={day.receipts} />
                  </td>
                  <td className={td(num)}>
                    <Money value={day.payments} />
                  </td>
                  <td className={td(num)}>
                    <Money value={day.closing} strong />
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="bg-muted/30 border-b">
                    <td className="p-0" colSpan={5}>
                      <table className="w-full text-xs">
                        <tbody>
                          {entries.map((entry, index) => (
                            <tr
                              key={index}
                              className={cn(
                                entry.cancelled && "text-muted-foreground",
                              )}
                            >
                              <td className="py-1.5 pl-8 pr-2">{entry.account}</td>
                              <td className="px-2 py-1.5">
                                {typeLabel(entry.voucherType)}{" "}
                                <VoucherLink
                                  type={entry.voucherType}
                                  no={entry.voucherNo}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                {entry.narration ?? ""}
                                {entry.cancelled ? " (cancelled)" : ""}
                              </td>
                              <td className={cn("px-2 py-1.5", num)}>
                                {entry.debit ? <Money value={entry.debit} /> : null}
                              </td>
                              <td className={cn("px-3 py-1.5", num)}>
                                {entry.credit ? <Money value={entry.credit} /> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {report.daily.length === 0 ? (
            <tr>
              <td className={td("text-muted-foreground text-center")} colSpan={5}>
                No movements in this period.
              </td>
            </tr>
          ) : null}
        </tbody>
        <tfoot>
          <tr className="bg-muted/40 border-t font-medium">
            <td className={td()}>Total</td>
            <td className={td(num)}>
              <Money value={report.opening} strong />
            </td>
            <td className={td(num)}>
              <Money value={receipts} strong />
            </td>
            <td className={td(num)}>
              <Money value={payments} strong />
            </td>
            <td className={td(num)}>
              <Money value={report.closing} strong />
            </td>
          </tr>
        </tfoot>
      </ReportTable>
    </ReportShell>
  );
}

export function TrialBalanceReportPage({
  report,
  ...rest
}: PageProps<TrialBalanceReport>) {
  const difference = Math.round((report.totals.debit - report.totals.credit) * 100) / 100;
  const ledgerPath = ACCOUNTING_REPORTS.ledger.path;
  return (
    <ReportShell reportKey="trial-balance" {...rest}>
      {report.groups.length === 0 ? (
        <Empty title="No balances">No account has a balance as of this date.</Empty>
      ) : (
        <ReportTable>
          <thead>
            <tr>
              <th className={th()}>Code</th>
              <th className={th()}>Account</th>
              <th className={th(num)}>Debit</th>
              <th className={th(num)}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {report.groups.map((group) => (
              <Fragment key={group.type}>
                <tr className="bg-muted/40 border-b font-medium">
                  <td className={td()} colSpan={2}>
                    {ACCOUNT_TYPE_BADGES[group.type] ?? group.type}
                  </td>
                  <td className={td(num)}>
                    <Money value={group.debit} strong />
                  </td>
                  <td className={td(num)}>
                    <Money value={group.credit} strong />
                  </td>
                </tr>
                {group.accounts.map((line) => (
                  <tr key={line.code} className="border-b">
                    <td className={td("font-mono")}>{line.code}</td>
                    <td className={td()}>
                      <Link
                        href={`${ledgerPath}?${new URLSearchParams({ code: line.code, range: "all" })}`}
                        className="hover:underline"
                      >
                        {line.name}
                      </Link>
                    </td>
                    <td className={td(num)}>
                      {line.debit ? <Money value={line.debit} /> : null}
                    </td>
                    <td className={td(num)}>
                      {line.credit ? <Money value={line.credit} /> : null}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 border-t font-medium">
              <td className={td()} colSpan={2}>
                Total
                {difference !== 0 ? (
                  <span className="text-destructive ml-2 text-xs font-normal">
                    Out of balance by <Money value={Math.abs(difference)} />
                  </span>
                ) : null}
              </td>
              <td className={td(num)}>
                <Money value={report.totals.debit} strong />
              </td>
              <td className={td(num)}>
                <Money value={report.totals.credit} strong />
              </td>
            </tr>
          </tfoot>
        </ReportTable>
      )}
    </ReportShell>
  );
}
