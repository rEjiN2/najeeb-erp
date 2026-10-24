"use client";

import {
  Ban,
  Eye,
  History,
  MessageSquare,
  MoreHorizontal,
  PackagePlus,
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
import { SearchableSelect } from "@/components/shared/searchable-select";
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
import {
  LOCATION_TYPE_LABELS,
  type StockLocation,
} from "@/features/locations/types";
import { formatQty } from "@/features/stock/constants";
import {
  CancelVoucherDialog,
  type CancelTarget,
} from "@/features/vouchers/cancel-voucher-dialog";
import type { VoucherAccess } from "@/features/vouchers/config";
import { DateRangeControl } from "@/features/vouchers/list/voucher-filter-bar";
import { formatCalendarDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import { cancelOpeningStock } from "./actions";
import {
  OPENING_STOCK_CONFIG as config,
  OPENING_STOCK_PAGE_SIZE,
  OPENING_STOCK_PATH,
  openingStockPath,
} from "./constants";
import { toOpeningStockSearch } from "./filters";
import type { OpeningStockFilters, OpeningStockPage } from "./types";

const STATUS_ITEMS: Record<OpeningStockFilters["status"], string> = {
  all: "All statuses",
  posted: "Posted",
  cancelled: "Cancelled",
};

export function OpeningStockList({
  page,
  filters,
  access,
  locations,
}: {
  page: OpeningStockPage;
  filters: OpeningStockFilters;
  access: VoucherAccess;
  /** null when they couldn't be loaded — that filter is disabled. */
  locations: StockLocation[] | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [activity, setActivity] = useState<{
    entityId: string;
    title: string;
  } | null>(null);

  function navigate(next: Partial<OpeningStockFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toOpeningStockSearch(merged)}`, {
        scroll: false,
      }),
    );
  }

  const filtered =
    filters.range !== "all" ||
    filters.status !== "all" ||
    filters.locationId !== "";
  const pageCount = Math.max(
    1,
    Math.ceil(page.summary.count / OPENING_STOCK_PAGE_SIZE),
  );
  const newButton = access.canCreate ? (
    <Link href={`${OPENING_STOCK_PATH}/new`} className={buttonVariants()}>
      <Plus /> New Opening Stock
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
            navigate({ status: value as OpeningStockFilters["status"] })
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
          <SearchableSelect
            value={filters.locationId || null}
            onChange={(value) => navigate({ locationId: value ?? "" })}
            options={(locations ?? []).map((location) => ({
              value: location.id,
              label: location.name,
              description: location.code,
              badge: LOCATION_TYPE_LABELS[location.type],
            }))}
            placeholder={locations ? "All locations" : "Locations unavailable"}
            emptyText="No matching locations"
            clearLabel="All locations"
            disabled={locations === null}
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
            title="No opening stock matches these filters"
            action={
              <Button
                variant="outline"
                onClick={() =>
                  navigate({
                    range: "all",
                    from: "",
                    to: "",
                    status: "all",
                    locationId: "",
                  })
                }
              >
                Clear filters
              </Button>
            }
          >
            Try another date range or location.
          </StatePanel>
        ) : (
          <StatePanel
            icon={PackagePlus}
            title="No opening stock yet"
            action={newButton ?? undefined}
          >
            Bring each location&apos;s stock on hand over from the old system,
            by hand or from a CSV.
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
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>As of</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Total qty</TableHead>
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
                  const viewHref = openingStockPath(row.id);
                  const isPosted = !isVoidStatus(row.status);
                  const openActivity = () =>
                    setActivity({
                      entityId: row.id,
                      title: `Activity · ${row.voucherNo}`,
                    });
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
                      <TableCell className="text-sm">
                        {row.location.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.lineCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatQty(row.totalQty)}
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
                            openActivity();
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
                            <DropdownMenuItem onClick={openActivity}>
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
                                      grandTotal: row.totalQty,
                                    })
                                  }
                                >
                                  <Ban /> Cancel opening stock
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
            pageSize={OPENING_STOCK_PAGE_SIZE}
            onPageChange={(next) => navigate({ page: next }, false)}
          />
        </>
      )}

      <CancelVoucherDialog
        config={config}
        cancelAction={cancelOpeningStock}
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
