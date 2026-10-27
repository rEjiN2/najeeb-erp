"use client";

import {
  Ban,
  ClipboardCheck,
  Eye,
  History,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LOCATION_TYPE_LABELS,
  type StockLocation,
} from "@/features/locations/types";
import {
  CancelVoucherDialog,
  type CancelTarget,
} from "@/features/vouchers/cancel-voucher-dialog";
import { DateRangeControl } from "@/features/vouchers/list/voucher-filter-bar";
import { formatCalendarDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import { cancelStockCount } from "./actions";
import {
  STOCK_COUNT_CONFIG as config,
  STOCK_COUNT_STATUS_LABELS,
  STOCK_COUNTS_PAGE_SIZE,
  STOCK_COUNTS_PATH,
  stockCountPath,
} from "./constants";
import { toStockCountSearch } from "./filters";
import { StockCountStatusBadge } from "./stock-count-status-badge";
import type { StockCountFilters, StockCountPage } from "./types";

export interface StockCountAccess {
  canCreate: boolean;
  canApprove: boolean;
  canCancel: boolean;
  userId: string;
}

const TABS: { value: StockCountFilters["status"]; label: string }[] = [
  { value: "all", label: "All" },
  ...(["draft", "submitted", "approved", "rejected", "cancelled"] as const).map(
    (value) => ({ value, label: STOCK_COUNT_STATUS_LABELS[value] }),
  ),
];

export function StockCountList({
  page,
  filters,
  access,
  locations,
}: {
  page: StockCountPage;
  filters: StockCountFilters;
  access: StockCountAccess;
  /** null when they couldn't be loaded — that filter is disabled. */
  locations: StockLocation[] | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [activity, setActivity] = useState<{
    entityId: string;
    title: string;
  } | null>(null);

  function navigate(next: Partial<StockCountFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toStockCountSearch(merged)}`, {
        scroll: false,
      }),
    );
  }

  const filtered =
    filters.range !== "all" ||
    filters.status !== "all" ||
    filters.locationId !== "" ||
    filters.q !== "";
  const pageCount = Math.max(
    1,
    Math.ceil(page.summary.count / STOCK_COUNTS_PAGE_SIZE),
  );
  const newButton = access.canCreate ? (
    <Link href={`${STOCK_COUNTS_PATH}/new`} className={buttonVariants()}>
      <Plus /> New Stock Count
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

      <div className="bg-card space-y-3 rounded-lg border p-3 sm:p-4">
        <Tabs
          value={filters.status}
          onValueChange={(value) =>
            navigate({ status: value as StockCountFilters["status"] })
          }
        >
          <TabsList className="w-full overflow-x-auto sm:w-fit">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
          <div className="relative lg:w-64">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              aria-label="Search stock counts"
              placeholder="Search number or comments…"
              value={search}
              className="pl-8"
              onChange={(event) => setSearch(event.target.value)}
              onBlur={() => search !== filters.q && navigate({ q: search })}
              onKeyDown={(event) => {
                if (event.key === "Enter") navigate({ q: search });
              }}
            />
          </div>
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
              placeholder={
                locations ? "All locations" : "Locations unavailable"
              }
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
      </div>

      {page.items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={SearchX}
            title="No stock counts match these filters"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  navigate({
                    range: "all",
                    from: "",
                    to: "",
                    status: "all",
                    locationId: "",
                    q: "",
                  });
                }}
              >
                Clear filters
              </Button>
            }
          >
            Try another status, date range or location.
          </StatePanel>
        ) : (
          <StatePanel
            icon={ClipboardCheck}
            title="No stock counts yet"
            action={newButton ?? undefined}
          >
            Count a warehouse, store or van, then have the difference approved
            to correct its stock.
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
                  <TableHead>Count No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Products</TableHead>
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
                  const viewHref = stockCountPath(row.id);
                  const closed =
                    row.status === "cancelled" || row.status === "rejected";
                  const canEdit =
                    row.status === "draft" &&
                    access.canCreate &&
                    row.createdBy?.id === access.userId;
                  const canReview =
                    row.status === "submitted" &&
                    access.canApprove &&
                    row.submittedBy?.id !== access.userId;
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
                        closed && "text-muted-foreground",
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
                        {formatCalendarDate(row.date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.location.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.lineCount}
                      </TableCell>
                      <TableCell>
                        <StockCountStatusBadge status={row.status} />
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
                            {canEdit ? (
                              <DropdownMenuItem
                                onClick={() => router.push(`${viewHref}/edit`)}
                              >
                                <Pencil /> Continue counting
                              </DropdownMenuItem>
                            ) : null}
                            {canReview ? (
                              <DropdownMenuItem
                                onClick={() => router.push(viewHref)}
                              >
                                <ClipboardCheck /> Review &amp; approve
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={openActivity}>
                              <History /> Activity &amp; Comments
                            </DropdownMenuItem>
                            {!closed && access.canCancel ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setCancelTarget({
                                      id: row.id,
                                      voucherNo: row.voucherNo,
                                      grandTotal: 0,
                                    })
                                  }
                                >
                                  <Ban /> Cancel stock count
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
            pageSize={STOCK_COUNTS_PAGE_SIZE}
            onPageChange={(next) => navigate({ page: next }, false)}
          />
        </>
      )}

      <CancelVoucherDialog
        config={config}
        cancelAction={cancelStockCount}
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
