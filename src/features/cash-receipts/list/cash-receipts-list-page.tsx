"use client";

import { CalendarRange, HandCoins, Plus, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActivitySheet } from "@/components/activity/activity-sheet";
import { MasterPagination } from "@/components/master/master-pagination";
import { StatePanel } from "@/components/master/state-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CashierLookupItem } from "@/features/cashiers/types";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import {
  CancelReceiptDialog,
  type CancelTarget,
} from "../cancel-receipt-dialog";
import {
  CASH_RECEIPTS_DESCRIPTION,
  CASH_RECEIPTS_TITLE,
  CASH_RECEIPT_ENTITY_TYPE,
  NEW_CASH_RECEIPT_PATH,
} from "../constants";
import {
  DATE_PRESET_LABELS,
  PAGE_SIZES,
  clearedFilters,
  hasActiveFilters,
  toSearch,
  type CashReceiptFilters,
  type SortField,
} from "../filters";
import type { AccountLookupItem, CashReceiptPage, UserRef } from "../types";
import { useReceiptPdf } from "../use-receipt-pdf";
import { ReceiptFilterBar, type Loadable } from "./receipt-filter-bar";
import { ReceiptsTable } from "./receipts-table";

interface CashReceiptsListPageProps {
  page: CashReceiptPage;
  filters: CashReceiptFilters;
  /** The calendar days the date filter resolved to (UAE), for the summary. */
  dateRange: { dateFrom?: string; dateTo?: string };
  /** Posted receipts among the filtered ones. */
  postedCount: number;
  /** No receipt exists at all — not just none matching the filters. */
  isFirstRun: boolean;
  canManage: boolean;
  cashAccounts: Loadable<AccountLookupItem[]>;
  users: Loadable<UserRef[]>;
  cashiers: Loadable<CashierLookupItem[]>;
  selectedAccountName: string | null;
}

const PAGE_SIZE_ITEMS = Object.fromEntries(
  PAGE_SIZES.map((size) => [String(size), `${size} / page`]),
);

function describeRange(
  filters: CashReceiptFilters,
  { dateFrom, dateTo }: { dateFrom?: string; dateTo?: string },
): string {
  if (!dateFrom && !dateTo) return DATE_PRESET_LABELS.all;
  const span =
    dateFrom && dateTo
      ? dateFrom === dateTo
        ? formatCalendarDate(dateFrom)
        : `${formatCalendarDate(dateFrom)} – ${formatCalendarDate(dateTo)}`
      : dateFrom
        ? `From ${formatCalendarDate(dateFrom)}`
        : `Up to ${formatCalendarDate(dateTo!)}`;
  return filters.range === "custom"
    ? span
    : `${DATE_PRESET_LABELS[filters.range]} · ${span}`;
}

function SummaryStrip({
  page,
  filters,
  dateRange,
  postedCount,
}: Pick<
  CashReceiptsListPageProps,
  "page" | "filters" | "dateRange" | "postedCount"
>) {
  const cancelledCount = page.summary.count - postedCount;
  const onlyCancelled = filters.status === "cancelled";

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:gap-10">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {onlyCancelled ? "Cancelled receipts" : "Receipts"}
        </p>
        <p className="font-heading text-2xl font-semibold tabular-nums">
          {onlyCancelled ? cancelledCount : postedCount}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Total received
        </p>
        <p className="font-heading font-mono text-2xl font-semibold tabular-nums">
          {formatAmount(page.summary.total)}
        </p>
      </div>
      <div className="text-muted-foreground space-y-0.5 text-sm sm:ml-auto sm:text-right">
        <p className="flex items-center gap-1.5 sm:justify-end">
          <CalendarRange className="size-3.5" />
          {describeRange(filters, dateRange)}
        </p>
        <p>
          {onlyCancelled
            ? "Cancelled receipts aren't counted in totals."
            : cancelledCount > 0
              ? `Excludes ${cancelledCount} cancelled ${cancelledCount === 1 ? "receipt" : "receipts"}.`
              : "Cancelled receipts are excluded."}
        </p>
      </div>
    </div>
  );
}

export function CashReceiptsListPage({
  page,
  filters,
  dateRange,
  postedCount,
  isFirstRun,
  canManage,
  cashAccounts,
  users,
  cashiers,
  selectedAccountName,
}: CashReceiptsListPageProps) {
  const router = useRouter();
  const pdf = useReceiptPdf();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [activityTarget, setActivityTarget] = useState<{
    entityId: string;
    title: string;
  } | null>(null);

  // Filters, sorting and paging live in the URL: the server component
  // re-fetches for them, and the view survives a refresh or a shared link.
  function navigate(next: Partial<CashReceiptFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toSearch(merged)}`, { scroll: false }),
    );
  }

  function sortBy(field: SortField) {
    navigate({
      sortBy: field,
      sortDir:
        filters.sortBy === field && filters.sortDir === "desc" ? "asc" : "desc",
    });
  }

  const filtered = hasActiveFilters(filters);
  const pageCount = Math.max(
    1,
    Math.ceil(page.summary.count / filters.pageSize),
  );

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {CASH_RECEIPTS_TITLE}
        </h1>
        <p className="text-muted-foreground text-sm">
          {CASH_RECEIPTS_DESCRIPTION}
        </p>
      </div>
      {canManage && !isFirstRun ? (
        <Link href={NEW_CASH_RECEIPT_PATH} className={buttonVariants()}>
          <Plus /> Create Receipt
        </Link>
      ) : null}
    </div>
  );

  if (isFirstRun) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel
          icon={HandCoins}
          title="No cash receipts yet"
          action={
            canManage ? (
              <Link href={NEW_CASH_RECEIPT_PATH} className={buttonVariants()}>
                <Plus /> Create your first receipt
              </Link>
            ) : undefined
          }
        >
          {canManage
            ? "Record cash collected from customers. Each receipt posts to a cash account and the parties it was received from."
            : "Receipts will appear here once someone records one."}
        </StatePanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <ReceiptFilterBar
        filters={filters}
        onChange={(next) => navigate(next)}
        onClear={() => navigate(clearedFilters(filters))}
        busy={isNavigating}
        cashAccounts={cashAccounts}
        users={users}
        cashiers={cashiers}
        selectedAccountName={selectedAccountName}
      />

      <SummaryStrip
        page={page}
        filters={filters}
        dateRange={dateRange}
        postedCount={postedCount}
      />

      {page.items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={SearchX}
            title="No receipts match these filters"
            action={
              <Button
                variant="outline"
                onClick={() => navigate(clearedFilters(filters))}
              >
                Clear filters
              </Button>
            }
          >
            Try a wider date range, or clear the filters to see this
            month&apos;s receipts.
          </StatePanel>
        ) : (
          // Only the default "This month" applies, and nothing falls in it.
          <StatePanel
            icon={CalendarRange}
            title="No receipts this month"
            action={
              <Button
                variant="outline"
                onClick={() => navigate({ range: "all" })}
              >
                Show all time
              </Button>
            }
          >
            Nothing has been received since the 1st. Earlier receipts are still
            there.
          </StatePanel>
        )
      ) : (
        <>
          <ReceiptsTable
            rows={page.items}
            filters={filters}
            onSort={sortBy}
            canManage={canManage}
            busy={isNavigating}
            onPrint={(row) => void pdf.print(row.id, row.voucherNo)}
            onActivity={(row) =>
              setActivityTarget({
                entityId: row.id,
                title: `Activity · ${row.voucherNo}`,
              })
            }
            onCancel={(row) =>
              setCancelTarget({
                id: row.id,
                voucherNo: row.voucherNo,
                grandTotal: row.grandTotal,
              })
            }
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select
              value={String(filters.pageSize)}
              onValueChange={(value) =>
                value && navigate({ pageSize: Number(value) })
              }
              items={PAGE_SIZE_ITEMS}
            >
              <SelectTrigger className="w-32" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="sm:min-w-72">
              <MasterPagination
                page={filters.page}
                pageCount={pageCount}
                totalItems={page.summary.count}
                pageSize={filters.pageSize}
                onPageChange={(next) => navigate({ page: next }, false)}
              />
            </div>
          </div>
        </>
      )}

      {pdf.fallback}

      <CancelReceiptDialog
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />

      <ActivitySheet
        target={activityTarget}
        onClose={() => setActivityTarget(null)}
        entityType={CASH_RECEIPT_ENTITY_TYPE}
        subjectLabel="receipt"
        // The list's comment count is server-rendered; re-fetch it.
        onCommentAdded={() => startNavigation(() => router.refresh())}
      />
    </div>
  );
}
