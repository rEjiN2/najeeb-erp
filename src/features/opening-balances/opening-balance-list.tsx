"use client";

import {
  Ban,
  Eye,
  History,
  Landmark,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActivitySheet } from "@/components/activity/activity-sheet";
import { MasterPagination } from "@/components/master/master-pagination";
import { StatePanel } from "@/components/master/state-panel";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  VoucherStatusBadge,
  isVoidStatus,
} from "@/components/voucher/voucher-status-badge";
import { lineAccountSearch } from "@/features/vouchers/account-search";
import {
  CancelVoucherDialog,
  type CancelTarget,
} from "@/features/vouchers/cancel-voucher-dialog";
import type { VoucherAccess } from "@/features/vouchers/config";
import { DateRangeControl } from "@/features/vouchers/list/voucher-filter-bar";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { cancelOpeningBalance } from "./actions";
import {
  OPENING_ACCOUNT_TYPES,
  OPENING_BALANCE_CONFIG as config,
  OPENING_BALANCES_PAGE_SIZE,
  OPENING_BALANCES_PATH,
  openingBalancePath,
} from "./constants";
import { toOpeningBalanceSearch } from "./filters";
import type {
  OpeningBalanceFilters,
  OpeningBalancePage,
  OpeningBalanceRow,
} from "./types";

const STATUS_ITEMS: Record<OpeningBalanceFilters["status"], string> = {
  all: "All statuses",
  posted: "Posted",
  cancelled: "Cancelled",
};

function Equity({ row }: { row: OpeningBalanceRow }) {
  const amount = row.equityDebit || row.equityCredit;
  if (!amount) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-mono text-sm tabular-nums">
      {row.equityDebit ? "Dr" : "Cr"} {formatAmount(amount)}
    </span>
  );
}

export function OpeningBalanceList({
  page,
  filters,
  access,
  accountName,
}: {
  page: OpeningBalancePage;
  filters: OpeningBalanceFilters;
  access: VoucherAccess;
  /** The account filter's name, resolved on the server. */
  accountName: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [activity, setActivity] = useState<{
    entityId: string;
    title: string;
  } | null>(null);

  function navigate(next: Partial<OpeningBalanceFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toOpeningBalanceSearch(merged)}`, {
        scroll: false,
      }),
    );
  }

  const filtered =
    filters.range !== "all" ||
    filters.status !== "all" ||
    filters.accountId !== "";
  const pageCount = Math.max(
    1,
    Math.ceil(page.summary.count / OPENING_BALANCES_PAGE_SIZE),
  );
  const newButton = access.canCreate ? (
    <Link href={`${OPENING_BALANCES_PATH}/new`} className={buttonVariants()}>
      <Plus /> New Opening Balance
    </Link>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {config.title}
          </h1>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </div>
        {newButton}
      </div>

      <div className="bg-card flex flex-col gap-2 rounded-lg border p-3 sm:p-4 lg:flex-row lg:items-start">
        <Select
          value={filters.status}
          onValueChange={(value) =>
            value &&
            navigate({ status: value as OpeningBalanceFilters["status"] })
          }
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-full lg:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="lg:w-64">
          <AsyncSearchableSelect
            aria-label="Account"
            value={filters.accountId || null}
            valueLabel={accountName ?? "Unknown account"}
            onChange={(option) => navigate({ accountId: option?.value ?? "" })}
            search={lineAccountSearch(OPENING_ACCOUNT_TYPES)}
            placeholder="All accounts"
            searchPlaceholder="Search accounts..."
            emptyText="No matching accounts"
            clearLabel="All accounts"
          />
        </div>
        <DateRangeControl
          filters={filters}
          onChange={(range) => navigate(range)}
        />
      </div>

      {page.items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={SearchX}
            title="No opening balances match these filters"
            action={
              <Button
                variant="outline"
                onClick={() =>
                  navigate({
                    range: "all",
                    from: "",
                    to: "",
                    status: "all",
                    accountId: "",
                  })
                }
              >
                Clear filters
              </Button>
            }
          >
            Try another date range or account.
          </StatePanel>
        ) : (
          <StatePanel
            icon={Landmark}
            title="No opening balances yet"
            action={newButton ?? undefined}
          >
            Bring each customer, supplier, cash and bank balance over from the
            old system, by hand or from a CSV.
          </StatePanel>
        )
      ) : (
        <>
          <div
            aria-busy={isNavigating}
            className={cn(
              "bg-card overflow-x-auto rounded-lg border transition-opacity",
              isNavigating && "pointer-events-none opacity-60",
            )}
          >
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>As of</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                  <TableHead className="text-right">Total debit</TableHead>
                  <TableHead className="text-right">Total credit</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead className="text-center">Comments</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((row) => {
                  const viewHref = openingBalancePath(row.id);
                  const isPosted = !isVoidStatus(row.status);
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => router.push(viewHref)}
                      className={cn(
                        "cursor-pointer",
                        !isPosted && "text-muted-foreground",
                      )}
                    >
                      <TableCell>
                        <Link
                          href={viewHref}
                          onClick={(event) => event.stopPropagation()}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {row.voucherNo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatCalendarDate(row.asOfDate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.lineCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatAmount(row.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatAmount(row.totalCredit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Equity row={row} />
                      </TableCell>
                      <TableCell>
                        <VoucherStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.createdBy?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActivity({
                              entityId: row.id,
                              title: `Activity · ${row.voucherNo}`,
                            });
                          }}
                          aria-label={`${row.commentCount} comments — open activity`}
                          className={cn(
                            "hover:bg-muted inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm tabular-nums",
                            row.commentCount === 0 && "text-muted-foreground",
                          )}
                        >
                          <MessageSquare className="size-3.5" />
                          {row.commentCount}
                        </button>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${row.voucherNo}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => router.push(viewHref)}
                            >
                              <Eye /> View
                            </DropdownMenuItem>
                            {isPosted && access.canEdit ? (
                              <DropdownMenuItem
                                onClick={() => router.push(`${viewHref}/edit`)}
                              >
                                <Pencil /> Edit
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              onClick={() =>
                                setActivity({
                                  entityId: row.id,
                                  title: `Activity · ${row.voucherNo}`,
                                })
                              }
                            >
                              <History /> Activity &amp; Comments
                            </DropdownMenuItem>
                            {isPosted && access.canCancel ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setCancelTarget({
                                      id: row.id,
                                      voucherNo: row.voucherNo,
                                      grandTotal: row.totalDebit,
                                    })
                                  }
                                >
                                  <Ban /> Cancel opening balance
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <MasterPagination
            page={filters.page}
            pageCount={pageCount}
            totalItems={page.summary.count}
            pageSize={OPENING_BALANCES_PAGE_SIZE}
            onPageChange={(next) => navigate({ page: next }, false)}
          />
        </>
      )}

      <CancelVoucherDialog
        config={config}
        cancelAction={cancelOpeningBalance}
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />
      <ActivitySheet
        target={activity}
        onClose={() => setActivity(null)}
        entityType={config.entityType}
        subjectLabel={config.noun}
        onCommentAdded={() => startNavigation(() => router.refresh())}
      />
    </div>
  );
}
