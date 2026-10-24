"use client";

import { Download, History, Loader2, PackageSearch } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { StatePanel } from "@/components/master/state-panel";
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LOCATION_TYPE_LABELS,
  type StockLocation,
} from "@/features/locations/types";
import { downloadCsv } from "@/features/reports/salesman-collections/csv";
import { DateRangeControl } from "@/features/vouchers/list/voucher-filter-bar";
import { formatCalendarDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import {
  STOCK_HISTORY_DESCRIPTION,
  STOCK_HISTORY_TITLE,
  formatQty,
  voucherHref,
  voucherTypeLabel,
} from "./constants";
import { stockHistoryToCsv } from "./csv";
import { toHistorySearch } from "./filters";
import { searchProducts } from "./product-search";
import type {
  ProductLookupItem,
  StockHistory,
  StockHistoryFilters,
} from "./types";

interface StockHistoryViewProps {
  filters: StockHistoryFilters;
  /** The picked product; null before one is picked. */
  product: ProductLookupItem | null;
  /** null until a product is picked. */
  history: StockHistory | null;
  /** null when they couldn't be loaded — that filter is disabled. */
  locations: StockLocation[] | null;
}

function Qty({ value }: { value: number }) {
  return value ? (
    <span className="font-mono tabular-nums">{formatQty(value)}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

export function StockHistoryView({
  filters,
  product,
  history,
  locations,
}: StockHistoryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();

  function navigate(next: Partial<StockHistoryFilters>) {
    const url = `${pathname}${toHistorySearch({ ...filters, ...next })}`;
    startNavigation(() => router.replace(url, { scroll: false }));
  }

  function exportCsv() {
    if (!history || !product) return;
    downloadCsv(
      stockHistoryToCsv(history),
      `stock-history_${product.code}.csv`,
    );
  }

  const unit = product?.unit?.symbol ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {STOCK_HISTORY_TITLE}
          </h1>
          <p className="text-muted-foreground text-sm">
            {STOCK_HISTORY_DESCRIPTION}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={!history || history.items.length === 0}
        >
          <Download /> Export CSV
        </Button>
      </div>

      <div className="bg-card flex flex-col gap-2 rounded-lg border p-3 sm:p-4 lg:flex-row lg:items-start">
        <div className="lg:w-72">
          <AsyncSearchableSelect
            aria-label="Product"
            value={filters.productId || null}
            valueLabel={product ? `${product.code} · ${product.name}` : null}
            onChange={(option) => navigate({ productId: option?.value ?? "" })}
            search={searchProducts}
            placeholder="Pick a product"
            searchPlaceholder="Search name, code or barcode..."
            emptyText="No matching products"
            allowClear={false}
          />
        </div>
        <div className="lg:w-56">
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
        {isNavigating ? (
          <Loader2
            className="text-muted-foreground size-4 shrink-0 animate-spin self-center"
            aria-label="Loading"
          />
        ) : null}
      </div>

      {!history || !product ? (
        <StatePanel icon={PackageSearch} title="Pick a product">
          Choose a product to see every movement in and out, with the running
          balance.
        </StatePanel>
      ) : history.items.length === 0 ? (
        <StatePanel icon={History} title="No movements">
          {product.name} has no stock movements
          {filters.locationId ? " at this location" : ""} in this range.
          Balance: {formatQty(history.closing)} {unit}.
        </StatePanel>
      ) : (
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
                <TableHead>Date</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground text-sm"
                >
                  Opening balance
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatQty(history.opening)}
                </TableCell>
                <TableCell />
              </TableRow>
              {history.items.map((entry) => {
                const href = voucherHref(entry.voucherType, entry.voucherId);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatCalendarDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground block text-xs">
                        {voucherTypeLabel(entry.voucherType)}
                        {entry.isReversal ? " · reversal" : ""}
                      </span>
                      {href ? (
                        <Link
                          href={href}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {entry.voucherNo}
                        </Link>
                      ) : (
                        <span className="font-mono text-sm">
                          {entry.voucherNo}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.location.name ?? "Unknown location"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <Qty value={entry.in} />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <Qty value={entry.out} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono text-sm font-medium tabular-nums",
                        entry.balance < 0 && "text-destructive",
                      )}
                    >
                      {formatQty(entry.balance)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.by?.name ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="font-medium">
                  Closing balance
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatQty(history.closing)} {unit}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}
