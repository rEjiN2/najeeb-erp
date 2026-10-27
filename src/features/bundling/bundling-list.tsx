"use client";

import {
  Boxes,
  Eye,
  History,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  SearchX,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActivitySheet } from "@/components/activity/activity-sheet";
import { MasterPagination } from "@/components/master/master-pagination";
import { StatePanel } from "@/components/master/state-panel";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Badge } from "@/components/ui/badge";
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
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { cancelBundling } from "./actions";
import {
  BUNDLING_CONFIG as config,
  BUNDLING_MODE_LABELS,
  BUNDLING_PAGE_SIZE,
  BUNDLING_PATH,
  bundlingPath,
} from "./constants";
import { toBundlingSearch } from "./filters";
import type { BundleOption, BundlingFilters, BundlingPage } from "./types";

const STATUS_ITEMS: Record<BundlingFilters["status"], string> = {
  all: "All statuses",
  posted: "Posted",
  cancelled: "Undone",
};

const MODE_ITEMS: Record<BundlingFilters["mode"], string> = {
  all: "All modes",
  ...BUNDLING_MODE_LABELS,
};

export function BundlingList({
  page,
  filters,
  access,
  locations,
  bundles,
}: {
  page: BundlingPage;
  filters: BundlingFilters;
  access: VoucherAccess;
  /** null when they couldn't be loaded — that filter is disabled. */
  locations: StockLocation[] | null;
  bundles: BundleOption[] | null;
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

  function navigate(next: Partial<BundlingFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toBundlingSearch(merged)}`, {
        scroll: false,
      }),
    );
  }

  const filtered =
    filters.range !== "all" ||
    filters.status !== "all" ||
    filters.mode !== "all" ||
    filters.locationId !== "" ||
    filters.bundleProductId !== "" ||
    filters.q !== "";
  const pageCount = Math.max(
    1,
    Math.ceil(page.summary.count / BUNDLING_PAGE_SIZE),
  );
  const showCost = page.items.some((row) => row.costPerUnit !== undefined);
  const newButton = access.canCreate ? (
    <Link href={`${BUNDLING_PATH}/new`} className={buttonVariants()}>
      <Plus /> New Bundling
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

      <div className="bg-card grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label="Search bundlings"
            placeholder="Search number, product or remarks…"
            value={search}
            className="pl-8"
            onChange={(event) => setSearch(event.target.value)}
            onBlur={() => search !== filters.q && navigate({ q: search })}
            onKeyDown={(event) => {
              if (event.key === "Enter") navigate({ q: search });
            }}
          />
        </div>
        <Select
          value={filters.mode}
          onValueChange={(value) =>
            value && navigate({ mode: value as BundlingFilters["mode"] })
          }
          items={MODE_ITEMS}
        >
          <SelectTrigger className="w-full" aria-label="Mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MODE_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            value && navigate({ status: value as BundlingFilters["status"] })
          }
          items={STATUS_ITEMS}
        >
          <SelectTrigger className="w-full" aria-label="Status">
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
        <SearchableSelect
          value={filters.bundleProductId || null}
          onChange={(value) => navigate({ bundleProductId: value ?? "" })}
          options={(bundles ?? []).map((bundle) => ({
            value: bundle.id,
            label: bundle.name,
            description: bundle.code,
          }))}
          placeholder={bundles ? "All bundles" : "Bundles unavailable"}
          emptyText="No matching bundles"
          clearLabel="All bundles"
          disabled={bundles === null}
        />
        <div className="sm:col-span-2">
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
            title="No bundlings match these filters"
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
                    mode: "all",
                    locationId: "",
                    bundleProductId: "",
                    q: "",
                  });
                }}
              >
                Clear filters
              </Button>
            }
          >
            Try another date range, mode or location.
          </StatePanel>
        ) : (
          <StatePanel
            icon={Boxes}
            title="No bundlings yet"
            action={newButton ?? undefined}
          >
            Define a bundle&apos;s recipe on its product, then pack bundles from
            parts at a location.
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
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Bundle</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  {showCost ? (
                    <TableHead className="text-right">Cost / bundle</TableHead>
                  ) : null}
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
                  const viewHref = bundlingPath(row.id);
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
                        {formatCalendarDate(row.date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.location.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {BUNDLING_MODE_LABELS[row.mode]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.bundleProduct.name ?? "—"}
                        <span className="text-muted-foreground block font-mono text-xs">
                          {row.bundleProduct.code}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatQty(row.qty)}
                      </TableCell>
                      {showCost ? (
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {row.costPerUnit !== undefined
                            ? formatAmount(row.costPerUnit)
                            : "—"}
                        </TableCell>
                      ) : null}
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
                                      grandTotal: row.qty,
                                    })
                                  }
                                >
                                  <Undo2 /> Undo bundling
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
            pageSize={BUNDLING_PAGE_SIZE}
            onPageChange={(next) => navigate({ page: next }, false)}
          />
        </>
      )}

      <CancelVoucherDialog
        config={config}
        cancelAction={cancelBundling}
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
