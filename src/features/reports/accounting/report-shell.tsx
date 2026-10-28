"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { lineAccountSearch } from "@/features/vouchers/account-search";
import { DateRangeControl } from "@/features/vouchers/list/voucher-filter-bar";
import { uaeToday } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  ACCOUNTING_REPORTS,
  voucherViewPath,
  type AccountingReportKey,
} from "./constants";
import { toReportSearch, type ReportFilters } from "./filters";

/** The backend's page size for Ledger and Day Book. */
export const REPORT_PAGE_SIZE = 100;

/** AED, 2 decimals, right aligned; negatives in red. */
export function Money({
  value,
  strong = false,
}: {
  value: number;
  strong?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        strong && "font-semibold",
        value < 0 && "text-destructive",
      )}
    >
      {formatAmount(value)}
    </span>
  );
}

/** A voucher number linking to its view page, when that type has one. */
export function VoucherLink({
  type,
  id,
  no,
}: {
  type: string;
  id?: string;
  no: string;
}) {
  const href = id ? voucherViewPath(type, id) : null;
  return href ? (
    <Link href={href} className="font-mono text-sm hover:underline">
      {no}
    </Link>
  ) : (
    <span className="font-mono text-sm">{no}</span>
  );
}

/** One scroll box for both axes so the header can stick on phones too. */
export function ReportTable({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card max-h-[70vh] overflow-auto rounded-lg border">
      <table className="w-full min-w-[720px] caption-bottom text-sm">
        {children}
      </table>
    </div>
  );
}

export const stickyHead =
  "bg-card sticky top-0 z-10 shadow-[0_1px_0_var(--border)]";

interface ReportShellProps {
  reportKey: AccountingReportKey;
  filters: ReportFilters;
  /** Label for the selected account in the picker. */
  accountName: string | null;
  /** Backend query for the exports (no format). */
  exportQuery: string;
  /** Nothing to export yet (e.g. Ledger without an account). */
  exportDisabled?: boolean;
  /** Rows across all pages, for the pager. */
  total?: number;
  children: ReactNode;
}

export function ReportShell({
  reportKey,
  filters,
  accountName,
  exportQuery,
  exportDisabled = false,
  total,
  children,
}: ReportShellProps) {
  const meta = ACCOUNTING_REPORTS[reportKey];
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();

  function navigate(next: Partial<ReportFilters>) {
    const url = `${meta.path}${toReportSearch({ ...filters, page: 1, ...next }, meta.defaultRange)}`;
    startNavigation(() => router.replace(url, { scroll: false }));
  }

  const exportHref = (format: "csv" | "pdf") =>
    `/api/reports/${reportKey}?${exportQuery ? `${exportQuery}&` : ""}format=${format}`;
  const pages = total ? Math.ceil(total / REPORT_PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{meta.title}</h1>
          <p className="text-muted-foreground text-sm">{meta.description}</p>
        </div>
        <div className="flex gap-2">
          {exportDisabled ? (
            <>
              <Button variant="outline" disabled>
                <Download /> Export CSV
              </Button>
              <Button variant="outline" disabled>
                <Printer /> Print PDF
              </Button>
            </>
          ) : (
            <>
              <a
                href={exportHref("csv")}
                download
                className={buttonVariants({ variant: "outline" })}
              >
                <Download /> Export CSV
              </a>
              <a
                href={exportHref("pdf")}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                <Printer /> Print PDF
              </a>
            </>
          )}
        </div>
      </div>

      <div className="bg-card flex flex-col gap-3 rounded-lg border p-3 sm:p-4 lg:flex-row lg:items-start">
        {meta.account ? (
          <div className="lg:w-72">
            <AsyncSearchableSelect
              aria-label="Account"
              value={filters.accountId || null}
              valueLabel={accountName ?? "Unknown account"}
              onChange={(option) =>
                navigate({ accountId: option?.value ?? "", code: "" })
              }
              search={lineAccountSearch(meta.account.types)}
              placeholder={meta.account.placeholder}
              searchPlaceholder="Search by name or code"
              emptyText="No matching accounts"
              allowClear={!meta.account.required}
              clearLabel={meta.account.placeholder}
            />
          </div>
        ) : null}
        {meta.cancelled ? (
          <Label className="flex items-center gap-2 self-center text-sm font-normal">
            <Switch
              checked={filters.cancelled}
              onCheckedChange={(checked) => navigate({ cancelled: checked })}
            />
            Show cancelled
          </Label>
        ) : null}
        {meta.dates === "range" ? (
          <DateRangeControl
            filters={filters}
            onChange={(next) => navigate(next)}
          />
        ) : (
          <div className="flex items-center gap-2 lg:ml-auto">
            <Label htmlFor="as-of" className="text-sm font-normal">
              As of
            </Label>
            <Input
              id="as-of"
              type="date"
              className="w-40"
              value={filters.asOf || uaeToday()}
              onChange={(event) => navigate({ asOf: event.target.value })}
            />
          </div>
        )}
        {isNavigating ? (
          <Loader2
            className="text-muted-foreground size-4 shrink-0 animate-spin self-center"
            aria-label="Loading"
          />
        ) : null}
      </div>

      <div
        aria-busy={isNavigating}
        className={cn(
          "space-y-3 transition-opacity",
          isNavigating && "pointer-events-none opacity-60",
        )}
      >
        {children}
        {pages > 1 ? (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {filters.page} of {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={filters.page <= 1}
              onClick={() => navigate({ page: filters.page - 1 })}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={filters.page >= pages}
              onClick={() => navigate({ page: filters.page + 1 })}
            >
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
