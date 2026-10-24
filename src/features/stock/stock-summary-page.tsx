"use client";

import { ChevronRight, Loader2, PackageSearch, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { MasterPagination } from "@/components/master/master-pagination";
import { MasterToolbar } from "@/components/master/master-toolbar";
import { StatePanel } from "@/components/master/state-panel";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { groupPathOptions } from "@/features/product-groups/group-options";
import type { ProductGroup } from "@/features/product-groups/types";
import {
  LOCATION_TYPE_LABELS,
  type StockLocation,
} from "@/features/locations/types";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  STOCK_SUMMARY_DESCRIPTION,
  STOCK_SUMMARY_PAGE_SIZE,
  STOCK_SUMMARY_TITLE,
  formatQty,
  historyHref,
} from "./constants";
import { toSummarySearch } from "./filters";
import { StockStatusBadge } from "./stock-status-badge";
import type { StockSummaryFilters, StockSummaryPage } from "./types";

const SEARCH_DEBOUNCE_MS = 300;

interface StockSummaryPageProps {
  page: StockSummaryPage;
  filters: StockSummaryFilters;
  /** null when they couldn't be loaded — that filter is disabled. */
  groups: ProductGroup[] | null;
  locations: StockLocation[] | null;
  canViewCost: boolean;
}

export function StockSummaryView({
  page,
  filters,
  groups,
  locations,
  canViewCost,
}: StockSummaryPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [query, setQuery] = useState(filters.q);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const groupOptions = useMemo(() => groupPathOptions(groups ?? []), [groups]);

  function navigate(next: Partial<StockSummaryFilters>, resetPage = true) {
    const merged = { ...filters, ...(resetPage ? { page: 1 } : {}), ...next };
    startNavigation(() =>
      router.replace(`${pathname}${toSummarySearch(merged)}`, {
        scroll: false,
      }),
    );
  }

  function toggle(productId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  const filtered =
    filters.q !== "" ||
    filters.groupId !== "" ||
    filters.locationId !== "" ||
    filters.lowStock;
  const pageCount = Math.max(
    1,
    Math.ceil(page.total / STOCK_SUMMARY_PAGE_SIZE),
  );
  const columnCount = canViewCost ? 8 : 7;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {STOCK_SUMMARY_TITLE}
        </h1>
        <p className="text-muted-foreground text-sm">
          {STOCK_SUMMARY_DESCRIPTION}
        </p>
      </div>

      <MasterToolbar
        value={query}
        onChange={(value) => {
          setQuery(value);
          clearTimeout(searchTimer.current);
          searchTimer.current = setTimeout(
            () => navigate({ q: value.trim() }),
            SEARCH_DEBOUNCE_MS,
          );
        }}
        placeholder="Search name, code or barcode..."
      >
        {isNavigating ? (
          <Loader2
            className="text-muted-foreground size-4 animate-spin"
            aria-label="Loading"
          />
        ) : null}
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
          <div className="sm:w-64" title="Includes every group under it">
            <SearchableSelect
              value={filters.groupId || null}
              onChange={(value) => navigate({ groupId: value ?? "" })}
              options={groupOptions}
              placeholder={groups ? "All groups" : "Groups unavailable"}
              emptyText="No matching groups"
              clearLabel="All groups"
              disabled={groups === null}
            />
          </div>
          <div className="sm:w-56">
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
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <Checkbox
              checked={filters.lowStock}
              onCheckedChange={(checked) =>
                navigate({ lowStock: checked === true })
              }
            />
            Low stock only
          </label>
        </div>
      </MasterToolbar>

      {page.items.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={SearchX}
            title="No products match these filters"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  navigate({
                    q: "",
                    groupId: "",
                    locationId: "",
                    lowStock: false,
                  });
                }}
              >
                Clear filters
              </Button>
            }
          >
            Try another search, group or location.
          </StatePanel>
        ) : (
          <StatePanel icon={PackageSearch} title="No stock products yet">
            Products of type stock or bundle appear here. Bring stock on hand
            over with Opening Stock.
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
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Locations</span>
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {canViewCost ? (
                    <TableHead className="text-right">Value</TableHead>
                  ) : null}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((row) => {
                  const open = expanded.has(row.productId);
                  const href = historyHref(row.productId, filters.locationId);
                  return (
                    <Fragment key={row.productId}>
                      <TableRow
                        onClick={() => router.push(href)}
                        className="cursor-pointer"
                      >
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-expanded={open}
                            aria-label={`${open ? "Hide" : "Show"} locations for ${row.name}`}
                            onClick={() => toggle(row.productId)}
                            disabled={row.byLocation.length === 0}
                          >
                            <ChevronRight
                              className={cn(
                                "transition-transform",
                                open && "rotate-90",
                              )}
                            />
                          </Button>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {row.code}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={href}
                            onClick={(event) => event.stopPropagation()}
                            className="font-medium hover:underline"
                          >
                            {row.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.group?.name ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.unit?.symbol ?? "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono text-sm font-semibold tabular-nums",
                            row.total < 0 && "text-destructive",
                          )}
                        >
                          {formatQty(row.total)}
                        </TableCell>
                        {canViewCost ? (
                          <TableCell className="text-right font-mono text-sm tabular-nums">
                            {formatAmount(row.value ?? 0)}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <StockStatusBadge status={row.status} />
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={columnCount - 1}>
                            <ul className="divide-y text-sm">
                              {row.byLocation.map((location) => (
                                <li
                                  key={location.locationId}
                                  className="flex items-center justify-between gap-4 py-1.5"
                                >
                                  <Link
                                    href={historyHref(
                                      row.productId,
                                      location.locationId,
                                    )}
                                    className="hover:underline"
                                  >
                                    {location.name ?? "Unknown location"}
                                  </Link>
                                  <span
                                    className={cn(
                                      "font-mono tabular-nums",
                                      location.qty < 0 && "text-destructive",
                                    )}
                                  >
                                    {formatQty(location.qty)}{" "}
                                    <span className="text-muted-foreground">
                                      {row.unit?.symbol}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <MasterPagination
            page={filters.page}
            pageCount={pageCount}
            totalItems={page.total}
            pageSize={STOCK_SUMMARY_PAGE_SIZE}
            onPageChange={(next) => navigate({ page: next }, false)}
          />
        </>
      )}
    </div>
  );
}
